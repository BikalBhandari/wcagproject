const assert = require('assert');
const { createClient } = require('redis');

const USERNAME = process.env.APP_LOGIN_USERNAME || 'redis-e2e-user';
const PASSWORD = process.env.APP_LOGIN_PASSWORD || 'redis-e2e-pass';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const COOKIE_NAME = 'aa_session';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.APP_LOGIN_USERNAME = USERNAME;
process.env.APP_LOGIN_PASSWORD = PASSWORD;
process.env.REDIS_URL = REDIS_URL;
process.env.APP_ORIGIN = process.env.APP_ORIGIN || 'http://127.0.0.1';
process.env.TRUST_PROXY = process.env.TRUST_PROXY || '1';
process.env.PORT = process.env.PORT || '0';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

const { server, validateBoot } = require('../server/server');
const { closeRedisClient } = require('../utils/redisClient');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForReady(baseUrl) {
    const deadline = Date.now() + 20_000;

    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${baseUrl}/readyz`);
            if (res.ok) {
                const body = await res.json();
                if (body.ok && body.redis === true) {
                    return body;
                }
            }
        } catch (_) {
            // Retry until the server and Redis are both ready.
        }

        await sleep(250);
    }

    throw new Error('Server did not become ready with Redis enabled.');
}

function parseSessionCookie(header) {
    assert.ok(header, 'login response should set a session cookie');
    const cookiePair = header.split(';')[0];
    const [name, value] = cookiePair.split('=');
    assert.strictEqual(name, COOKIE_NAME, 'login should issue the auth session cookie');
    assert.ok(value, 'session cookie should include a token');
    return cookiePair;
}

async function main() {
    validateBoot();

    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const redis = createClient({ url: REDIS_URL });

    try {
        await redis.connect();
        await waitForReady(baseUrl);

        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });

        assert.strictEqual(loginResponse.status, 200, 'login should succeed against the production auth path');

        const loginBody = await loginResponse.json();
        assert.deepStrictEqual(
            loginBody,
            { success: true, username: USERNAME },
            'login should return the authenticated user payload'
        );

        const sessionCookie = parseSessionCookie(loginResponse.headers.get('set-cookie'));
        const sessionToken = sessionCookie.slice(`${COOKIE_NAME}=`.length);
        const sessionKey = `session:${sessionToken}`;

        const storedSession = await redis.get(sessionKey);
        assert.ok(storedSession, 'session should be persisted in Redis');

        const parsedSession = JSON.parse(storedSession);
        assert.strictEqual(parsedSession.username, USERNAME, 'stored session should match the logged in user');
        assert.strictEqual(typeof parsedSession.createdAt, 'number', 'stored session should record creation time');
        assert.strictEqual(typeof parsedSession.expiresAt, 'number', 'stored session should record expiry time');

        const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { cookie: sessionCookie }
        });
        assert.strictEqual(meResponse.status, 200, '/api/auth/me should accept the Redis-backed cookie');

        const meBody = await meResponse.json();
        assert.deepStrictEqual(
            meBody,
            { authenticated: true, user: { username: USERNAME } },
            '/api/auth/me should resolve the active Redis-backed session'
        );

        const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { cookie: sessionCookie }
        });
        assert.strictEqual(logoutResponse.status, 200, 'logout should succeed');

        const deletedSession = await redis.get(sessionKey);
        assert.strictEqual(deletedSession, null, 'logout should delete the Redis session');

        const readyResponse = await fetch(`${baseUrl}/readyz`);
        assert.strictEqual(readyResponse.status, 200, 'readiness should stay healthy with Redis configured');
        const readyBody = await readyResponse.json();
        assert.strictEqual(readyBody.redis, true, 'readiness should report Redis as healthy');

        console.log('✅ Redis-backed deployment path e2e test passed');
    } finally {
        await redis.quit().catch(() => {});
        await closeRedisClient().catch(() => {});
        await new Promise(resolve => server.close(resolve));
    }
}

main().catch(err => {
    console.error('❌ Redis-backed deployment path e2e test failed');
    console.error(err.stack || err.message || err);
    process.exit(1);
});
