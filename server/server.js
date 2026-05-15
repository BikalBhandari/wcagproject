const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { runAudit } = require('../index');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const scopesRouter = require('./routes/scopes');
const reportsRouter = require('./routes/reports');
const agentsRouter = require('./routes/agents');
const settingsRouter = require('./routes/settings');

const REPORT_OUTPUT_DIR = path.join(__dirname, '..', 'output', 'reports');

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

// Use modular routes
app.use('/api/scopes', scopesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/settings', settingsRouter);


// Serve the CSV reports from the output directory
app.use('/reports', express.static(REPORT_OUTPUT_DIR));

// Serve the Coda Ingestion Guide as a real HTML page
app.use('/guide', express.static(path.join(__dirname, '..', 'public', 'guide')));
app.get(['/guide', '/api/docs/coda-guide'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'guide', 'index.html'));
});


// Socket.io connection
io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('startAudit', async (data) => {
        let { file, agents } = data;
        
        // If no agents provided, use the ones enabled in the fleet config
        if (!agents || agents.length === 0) {
            try {
                // Clear cache for fresh config and registry
                const configPath = path.join(__dirname, '..', 'config', 'agents.config.js');
                const registryPath = path.join(__dirname, '..', 'agents', 'index.js');
                
                delete require.cache[require.resolve(configPath)];
                delete require.cache[require.resolve(registryPath)];
                
                // Also clear cache for all files in the agents directory to be safe
                const agentsDir = path.join(__dirname, '..', 'agents');
                fs.readdirSync(agentsDir).forEach(file => {
                    if (file.endsWith('.js')) {
                        delete require.cache[require.resolve(path.join(agentsDir, file))];
                    }
                });

                const agentsConfig = require(configPath);
                
                agents = agentsConfig.agents
                    .filter(a => a.enabled)
                    .map(a => a.name);
                
                console.log(`No agents specified, using enabled fleet: ${agents.join(', ')}`);
            } catch (err) {
                console.error('Error reading agents config:', err);
                agents = ['altTextAgent', 'altQualityAgent']; // Fallback
            }
        }

        console.log(`Starting audit for ${file} with agents: ${agents.length > 0 ? agents.join(', ') : 'None'}`);
        
        socket.emit('auditStarted', { file });

        if (agents.length === 0) {
            return socket.emit('auditError', { error: 'No agents are currently enabled. Please turn on at least one agent in the Agents tab.' });
        }

        // Validate scope file existence
        const scopePath = path.join(__dirname, '..', 'data', 'scopes', file);
        if (!fs.existsSync(scopePath)) {
            console.error(`Rejected audit: Scope file not found: ${scopePath}`);
            return socket.emit('auditError', { error: `Scope file '${file}' not found. Please select a valid scope.` });
        }

        const { getConfig } = require('../utils/config');
        const config = getConfig();

        const result = await runAudit(file, agents, config.concurrency, (progress) => {
            socket.emit('progress', progress);
        });

        if (result.error) {
            socket.emit('auditError', { error: result.error });
        } else {
            socket.emit('auditComplete', result);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
