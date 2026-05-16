const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { readJson, writeJson, ensureDir, RUNTIME_DIR } = require('./runtimeStore');
const { getRedisClient, isRedisConfigured } = require('./redisClient');
const { createLogger } = require('./logger');

const logger = createLogger('session-store');
const SESSION_STORE_FILE = path.join(RUNTIME_DIR, 'sessions.json');
const SESSION_PREFIX = 'session:';
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const localSessions = new Map();

function getSessionTtlMs() {
    const parsed = parseInt(process.env.AUTH_SESSION_TTL_MS, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_MS;
}

function persistLocalSessions() {
    ensureDir();
    writeJson(SESSION_STORE_FILE, Array.from(localSessions.entries()));
}

function loadLocalSessions() {
    const stored = readJson(SESSION_STORE_FILE, []);
    if (!Array.isArray(stored)) return;

    localSessions.clear();
    for (const entry of stored) {
        if (!Array.isArray(entry) || entry.length !== 2) continue;
        const [token, session] = entry;
        if (typeof token !== 'string' || !session || typeof session !== 'object') continue;
        if (typeof session.username !== 'string' || typeof session.expiresAt !== 'number') continue;
        localSessions.set(token, session);
    }
    clearExpiredLocalSessions();
}

function clearExpiredLocalSessions() {
    const now = Date.now();
    for (const [token, session] of localSessions.entries()) {
        if (session.expiresAt <= now) {
            localSessions.delete(token);
        }
    }
    persistLocalSessions();
}

async function createSession(username) {
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
        username,
        createdAt: Date.now(),
        expiresAt: Date.now() + getSessionTtlMs()
    };

    if (isRedisConfigured()) {
        const client = await getRedisClient();
        if (client) {
            await client.set(`${SESSION_PREFIX}${token}`, JSON.stringify(session), {
                PX: getSessionTtlMs()
            });
            return token;
        }
        logger.warn('Redis configured but unavailable; falling back to local session storage');
    }

    localSessions.set(token, session);
    persistLocalSessions();
    return token;
}

async function getSession(token) {
    if (!token) return null;

    if (isRedisConfigured()) {
        try {
            const client = await getRedisClient();
            if (client) {
                const raw = await client.get(`${SESSION_PREFIX}${token}`);
                if (!raw) return null;

                const session = JSON.parse(raw);
                if (!session || typeof session !== 'object') return null;
                if (typeof session.username !== 'string' || typeof session.expiresAt !== 'number') return null;
                if (session.expiresAt <= Date.now()) {
                    await client.del(`${SESSION_PREFIX}${token}`);
                    return null;
                }
                return session;
            }
        } catch (err) {
            logger.warn('Redis session lookup failed; using local fallback', err);
        }
    }

    const session = localSessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
        localSessions.delete(token);
        persistLocalSessions();
        return null;
    }

    return session;
}

async function destroySession(token) {
    if (!token) return;

    if (isRedisConfigured()) {
        try {
            const client = await getRedisClient();
            if (client) {
                await client.del(`${SESSION_PREFIX}${token}`);
                return;
            }
        } catch (err) {
            logger.warn('Redis session delete failed; using local fallback', err);
        }
    }

    localSessions.delete(token);
    persistLocalSessions();
}

async function clearExpiredSessions() {
    if (isRedisConfigured()) return;
    clearExpiredLocalSessions();
}

loadLocalSessions();
setInterval(() => {
    if (!isRedisConfigured()) {
        clearExpiredLocalSessions();
    }
}, 30 * 60 * 1000).unref?.();

module.exports = {
    SESSION_STORE_FILE,
    createSession,
    getSession,
    destroySession,
    clearExpiredSessions,
    getSessionTtlMs
};
