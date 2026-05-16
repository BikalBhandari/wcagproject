const crypto = require('crypto');
const { createSession, getSession, destroySession, clearExpiredSessions, getSessionTtlMs } = require('./sessionStore');

const COOKIE_NAME = 'aa_session';

function getLoginConfig() {
    const username =
        process.env.APP_LOGIN_USERNAME ||
        process.env.AUTH_USERNAME ||
        '';
    const password =
        process.env.APP_LOGIN_PASSWORD ||
        process.env.AUTH_PASSWORD ||
        '';

    return { username, password };
}

function isAuthConfigured() {
    const { username, password } = getLoginConfig();
    return Boolean(username && password);
}

function getCookieOptions() {
    const sameSite = (process.env.AUTH_COOKIE_SAMESITE || 'lax').toLowerCase();
    const secure = process.env.AUTH_COOKIE_SECURE
        ? process.env.AUTH_COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production';

    return {
        httpOnly: true,
        sameSite: sameSite === 'strict' || sameSite === 'none' ? sameSite : 'lax',
        secure,
        path: '/',
        maxAge: getSessionTtlMs()
    };
}

function parseCookies(cookieHeader = '') {
    return cookieHeader.split(';').reduce((acc, pair) => {
        const index = pair.indexOf('=');
        if (index === -1) return acc;
        const key = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        if (key) acc[key] = decodeURIComponent(value);
        return acc;
    }, {});
}

function verifyCredentials(username, password) {
    const config = getLoginConfig();
    const providedUser = Buffer.from(String(username ?? ''), 'utf8');
    const providedPass = Buffer.from(String(password ?? ''), 'utf8');
    const expectedUser = Buffer.from(String(config.username ?? ''), 'utf8');
    const expectedPass = Buffer.from(String(config.password ?? ''), 'utf8');

    const userMatch = providedUser.length === expectedUser.length
        && crypto.timingSafeEqual(providedUser, expectedUser);
    const passMatch = providedPass.length === expectedPass.length
        && crypto.timingSafeEqual(providedPass, expectedPass);

    return userMatch && passMatch;
}

async function getAuthenticatedUserFromReq(req) {
    const cookies = parseCookies(req.headers?.cookie || '');
    return getSession(cookies[COOKIE_NAME]);
}

async function loginHandler(req, res) {
    if (!isAuthConfigured()) {
        return res.status(500).json({
            error: 'Login is not configured. Set APP_LOGIN_USERNAME and APP_LOGIN_PASSWORD.'
        });
    }

    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (!verifyCredentials(username.trim(), password)) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = await createSession(username.trim());
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.json({ success: true, username: username.trim() });
}

async function logoutHandler(req, res) {
    const cookies = parseCookies(req.headers?.cookie || '');
    await destroySession(cookies[COOKIE_NAME]);

    res.clearCookie(COOKIE_NAME, getCookieOptions());

    return res.json({ success: true });
}

async function meHandler(req, res) {
    const user = await getAuthenticatedUserFromReq(req);
    if (!user) {
        return res.json({ authenticated: false });
    }

    return res.json({
        authenticated: true,
        user: { username: user.username }
    });
}

async function requireAuth(req, res, next) {
    const user = await getAuthenticatedUserFromReq(req);
    if (user) {
        req.user = user;
        return next();
    }

    if (req.method === 'GET' && req.path !== '/api/auth/me' && req.accepts('html')) {
        return res.redirect('/login');
    }

    return res.status(401).json({ error: 'Unauthorized' });
}

async function socketAuth(socket, next) {
    try {
        const cookies = parseCookies(socket.handshake.headers?.cookie || '');
        const user = await getSession(cookies[COOKIE_NAME]);

        if (!user) {
            return next(new Error('Unauthorized'));
        }

        socket.user = user;
        return next();
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    COOKIE_NAME,
    isAuthConfigured,
    getLoginConfig,
    parseCookies,
    verifyCredentials,
    getAuthenticatedUserFromReq,
    loginHandler,
    logoutHandler,
    meHandler,
    requireAuth,
    socketAuth,
    clearExpiredSessions
};
