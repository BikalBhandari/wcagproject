const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { runAudit } = require('../index');
const cors = require('cors');
const { readAgentConfig } = require('../utils/agentConfig');
const { validateAuditRequest, normalizeScopeFile } = require('../utils/requestValidation');
const { checkRateLimit, createRateLimit } = require('../utils/rateLimit');
const { createLogger } = require('../utils/logger');
const { validateStartupConfig, getConfig } = require('../utils/config');
const { closeRedisClient } = require('../utils/redisClient');
const {
    loginHandler,
    logoutHandler,
    meHandler,
    requireAuth,
    socketAuth,
    getAuthenticatedUserFromReq
} = require('../utils/auth');

const app = express();
const server = http.createServer(app);
const logger = createLogger('server');
const allowedOrigins = (process.env.APP_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : false,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const scopesRouter = require('./routes/scopes');
const reportsRouter = require('./routes/reports');
const agentsRouter = require('./routes/agents');
const settingsRouter = require('./routes/settings');

const REPORT_OUTPUT_DIR = path.join(__dirname, '..', 'output', 'reports');
const scanLimitWindowMs = 10 * 60 * 1000;
const scanLimitCount = 3;
const loginLimit = createRateLimit({ limit: 10, windowMs: 15 * 60 * 1000, keyPrefix: 'auth-login' });

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || 1 : 1);

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use((req, res, next) => {
    logger.debug('HTTP request', { method: req.method, path: req.originalUrl });
    next();
});
const publicDir = path.join(__dirname, '..', 'public');
const loginFile = path.join(publicDir, 'login.html');
const indexFile = path.join(publicDir, 'index.html');
const styleFile = path.join(publicDir, 'style.css');

app.get('/login', async (req, res) => {
    if (await getAuthenticatedUserFromReq(req)) {
        return res.redirect('/');
    }
    res.sendFile(loginFile);
});

app.post('/api/auth/login', loginLimit, loginHandler);
app.post('/api/auth/logout', logoutHandler);
app.get('/api/auth/me', meHandler);

app.get('/', async (req, res, next) => {
    if (!(await getAuthenticatedUserFromReq(req))) {
        return res.redirect('/login');
    }
    res.sendFile(indexFile);
});

app.get('/style.css', requireAuth, (req, res) => {
    res.sendFile(styleFile);
});

app.use('/css', requireAuth, express.static(path.join(publicDir, 'css')));
app.use('/js', requireAuth, express.static(path.join(publicDir, 'js')));
app.use('/views', requireAuth, express.static(path.join(publicDir, 'views')));
app.get('/guide', requireAuth, (req, res) => {
    res.sendFile(path.join(publicDir, 'guide', 'index.html'));
});

// Use modular routes
app.use('/api/scopes', requireAuth, scopesRouter);
app.use('/api/reports', requireAuth, reportsRouter);
app.use('/api/agents', requireAuth, agentsRouter);
app.use('/api/settings', requireAuth, settingsRouter);


// Serve the CSV reports from the output directory
app.use('/reports', requireAuth, express.static(REPORT_OUTPUT_DIR));

// Serve the Coda Ingestion Guide as a real HTML page
app.get(['/api/docs/coda-guide'], requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'guide', 'index.html'));
});


// Socket.io connection
io.use(socketAuth);
io.on('connection', (socket) => {
    logger.info('Socket connected', { user: socket.user?.username || 'unknown' });

    socket.on('startAudit', async (data) => {
        try {
            const clientKey = `scan:${socket.user?.username || socket.handshake.address || socket.id}`;
            const rateCheck = await checkRateLimit({ key: clientKey, limit: scanLimitCount, windowMs: scanLimitWindowMs });
            if (!rateCheck.allowed) {
                return socket.emit('auditError', { error: 'Rate limit exceeded. Please wait before starting another scan.' });
            }

            const requestResult = validateAuditRequest(data, {
                allowedAgents: readAgentConfig().agents.map(agent => agent.name)
            });
            if (!requestResult.valid) {
                return socket.emit('auditError', { error: requestResult.error });
            }

            let { file, agents } = requestResult.value;

            if (!agents || agents.length === 0) {
                try {
                    const agentsConfig = readAgentConfig();
                    agents = agentsConfig.agents
                        .filter(a => a.enabled)
                        .map(a => a.name);
                    logger.info('Using enabled fleet for scan', { agents });
                } catch (err) {
                    logger.warn('Error reading agents config; using fallback fleet', err);
                    agents = ['altTextAgent', 'altQualityAgent'];
                }
            }

            logger.info('Starting audit', { file, agents });

            socket.emit('auditStarted', { file });

            if (agents.length === 0) {
                return socket.emit('auditError', { error: 'No agents are currently enabled. Please turn on at least one agent in the Agents tab.' });
            }

            const normalizedFile = normalizeScopeFile(file);
            const scopePath = path.join(__dirname, '..', 'data', 'scopes', normalizedFile || file);
            if (!fs.existsSync(scopePath)) {
                logger.warn('Rejected audit: scope file not found', { scopePath });
                return socket.emit('auditError', { error: `Scope file '${file}' not found. Please select a valid scope.` });
            }

            const config = getConfig();

            const result = await runAudit(normalizedFile || file, agents, config.concurrency, (progress) => {
                socket.emit('progress', progress);
            });

            if (result.error) {
                socket.emit('auditError', { error: result.error });
            } else {
                socket.emit('auditComplete', result);
            }
        } catch (err) {
            logger.error('Audit socket handler failed', err);
            socket.emit('auditError', { error: 'The audit failed unexpectedly.' });
        }
    });

    socket.on('disconnect', () => {
        logger.info('Socket disconnected', { user: socket.user?.username || 'unknown' });
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled server error', err);
    res.status(500).json({
        error: 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 3000;

app.get('/healthz', (req, res) => {
    res.json({
        ok: true,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/readyz', async (req, res) => {
    try {
        const { isRedisConfigured, isRedisHealthy } = require('../utils/redisClient');
        const redisConfigured = isRedisConfigured();
        const redisHealthy = redisConfigured ? await isRedisHealthy() : true;

        if (redisConfigured && !redisHealthy) {
            return res.status(503).json({ ok: false, redis: false });
        }

        res.json({ ok: true, redis: redisHealthy, timestamp: new Date().toISOString() });
    } catch (err) {
        logger.error('Readiness check failed', err);
        res.status(503).json({ ok: false });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

function validateBoot() {
    const result = validateStartupConfig();
    result.warnings.forEach(message => logger.warn(message));
    if (result.errors.length > 0) {
        result.errors.forEach(message => logger.error(message));
        throw new Error('Startup configuration validation failed.');
    }
}

let shuttingDown = false;
async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}; shutting down`);

    try {
        await new Promise(resolve => io.close(() => resolve()));
        await new Promise(resolve => server.close(() => resolve()));
        await closeRedisClient();
    } catch (err) {
        logger.error('Error during shutdown', err);
    } finally {
        process.exit(exitCode);
    }
}

process.on('unhandledRejection', err => {
    logger.error('Unhandled promise rejection', err);
    shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', err => {
    logger.error('Uncaught exception', err);
    shutdown('uncaughtException', 1);
});

if (require.main === module) {
    try {
        validateBoot();
    } catch (err) {
        logger.error(err.message);
        process.exit(1);
    }

    server.listen(PORT, () => {
        logger.info(`Server running on http://localhost:${PORT}`);
    });

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = { app, server, io, validateBoot };
