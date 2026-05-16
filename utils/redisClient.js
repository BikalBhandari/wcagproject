const { createClient } = require('redis');
const { createLogger } = require('./logger');

const logger = createLogger('redis');

let clientPromise = null;
let clientInstance = null;

function isRedisConfigured() {
    return Boolean(process.env.REDIS_URL);
}

async function getRedisClient() {
    if (!isRedisConfigured()) {
        return null;
    }

    if (clientInstance?.isOpen) {
        return clientInstance;
    }

    if (!clientPromise) {
        clientPromise = (async () => {
            const client = createClient({
                url: process.env.REDIS_URL,
                socket: {
                    reconnectStrategy(retries) {
                        return Math.min(retries * 100, 2000);
                    }
                }
            });

            client.on('error', err => {
                logger.error('Redis client error', err);
            });

            await client.connect();
            clientInstance = client;
            logger.info('Connected to Redis');
            return client;
        })().catch(err => {
            clientPromise = null;
            clientInstance = null;
            throw err;
        });
    }

    return clientPromise;
}

async function closeRedisClient() {
    if (clientInstance?.isOpen) {
        try {
            await clientInstance.quit();
        } finally {
            clientInstance = null;
            clientPromise = null;
        }
    }
}

async function isRedisHealthy() {
    const client = await getRedisClient();
    if (!client) return false;
    const pong = await client.ping();
    return pong === 'PONG';
}

module.exports = {
    getRedisClient,
    closeRedisClient,
    isRedisConfigured,
    isRedisHealthy
};
