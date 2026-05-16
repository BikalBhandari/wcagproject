const path = require('path');
const { readJson, writeJson, ensureDir, RUNTIME_DIR } = require('./runtimeStore');
const { getRedisClient, isRedisConfigured } = require('./redisClient');
const { createLogger } = require('./logger');

const logger = createLogger('rate-limit');
const RATE_LIMIT_STORE_FILE = path.join(RUNTIME_DIR, 'rate-limits.json');
const buckets = new Map();
const RATE_LIMIT_PREFIX = 'rate-limit:';

function persistBuckets() {
    ensureDir();
    writeJson(RATE_LIMIT_STORE_FILE, Array.from(buckets.entries()));
}

function loadBuckets() {
    const stored = readJson(RATE_LIMIT_STORE_FILE, []);
    if (!Array.isArray(stored)) return;

    buckets.clear();
    for (const entry of stored) {
        if (!Array.isArray(entry) || entry.length !== 2) continue;
        const [key, bucket] = entry;
        if (typeof key !== 'string' || !bucket || typeof bucket !== 'object') continue;
        if (typeof bucket.count !== 'number' || typeof bucket.resetAt !== 'number') continue;
        buckets.set(key, bucket);
    }
}

function clearExpiredBuckets() {
    const now = Date.now();
    let changed = false;

    for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
            changed = true;
        }
    }

    if (changed) {
        persistBuckets();
    }
}

function getClientKey(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.ip
        || req.connection?.remoteAddress
        || 'unknown';
}

async function checkBucket(key, limit, windowMs) {
    if (isRedisConfigured()) {
        try {
            const client = await getRedisClient();
            if (client) {
                const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
                const count = await client.incr(redisKey);
                if (count === 1) {
                    await client.pExpire(redisKey, windowMs);
                }

                const ttl = await client.pTTL(redisKey);
                const resetAt = Date.now() + Math.max(0, ttl);
                return {
                    allowed: count <= limit,
                    remaining: Math.max(0, limit - count),
                    resetAt
                };
            }
        } catch (err) {
            logger.warn('Redis rate limit failed; using local fallback', err);
        }
    }

    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, {
            count: 1,
            resetAt: now + windowMs
        });
        persistBuckets();
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (bucket.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    persistBuckets();
    return { allowed: true, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

function createRateLimit({ limit, windowMs, keyPrefix }) {
    return async (req, res, next) => {
        const key = `${keyPrefix}:${getClientKey(req)}`;
        const result = await checkBucket(key, limit, windowMs);

        res.set('X-RateLimit-Limit', String(limit));
        res.set('X-RateLimit-Remaining', String(result.remaining));
        res.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

        if (!result.allowed) {
            return res.status(429).json({
                error: 'Rate limit exceeded. Please wait before trying again.'
            });
        }

        next();
    };
}

async function checkRateLimit({ key, limit, windowMs }) {
    return checkBucket(key, limit, windowMs);
}

loadBuckets();
setInterval(() => {
    if (!isRedisConfigured()) {
        clearExpiredBuckets();
    }
}, 30 * 60 * 1000).unref?.();

module.exports = {
    createRateLimit,
    checkRateLimit,
    getClientKey
};
