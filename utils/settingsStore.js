const fs = require('fs');
const path = require('path');
const { readJson, writeJson, ensureDir, RUNTIME_DIR } = require('./runtimeStore');
const { createLogger } = require('./logger');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SECRETS_FILE = path.join(RUNTIME_DIR, 'secrets.json');
const logger = createLogger('settings-store');

const DEFAULT_SETTINGS = {
    codaToken: '',
    codaDocId: '',
    concurrency: 10,
    timeout: 30000
};

const SECRET_KEYS = new Set(['visionKey', 'codaToken']);

function sanitizePublicSettings(settings = {}) {
    const sanitized = {};

    Object.entries(settings || {}).forEach(([key, value]) => {
        if (!SECRET_KEYS.has(key)) {
            sanitized[key] = value;
        }
    });

    return sanitized;
}

function sanitizeSecrets(secrets = {}) {
    const sanitized = {};

    for (const key of SECRET_KEYS) {
        if (secrets[key] !== undefined) {
            sanitized[key] = secrets[key];
        }
    }

    return sanitized;
}

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function readSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            const sanitized = sanitizePublicSettings(parsed);

            const secretPayload = {};
            for (const key of SECRET_KEYS) {
                if (parsed[key] !== undefined) {
                    secretPayload[key] = parsed[key];
                }
            }
            if (Object.keys(secretPayload).length > 0) {
                writeSecrets({ ...readSecrets(), ...secretPayload });
            }

            if (Object.keys(sanitized).length !== Object.keys(parsed || {}).length) {
                writeSettings(sanitized);
            }

            return sanitized;
        }
    } catch (err) {
        logger.warn('Could not read settings file', err);
    }

    return {};
}

function readSecrets() {
    return readJson(SECRETS_FILE, {});
}

function writeSecrets(secrets) {
    ensureDir();
    writeJson(SECRETS_FILE, sanitizeSecrets(secrets));
}

function writeSettings(settings) {
    ensureDataDir();

    const payload = JSON.stringify(sanitizePublicSettings(settings), null, 2);
    const tempPath = `${SETTINGS_FILE}.tmp`;
    fs.writeFileSync(tempPath, `${payload}\n`, 'utf8');
    fs.renameSync(tempPath, SETTINGS_FILE);
}

function getMergedSettings(overrides = {}) {
    const storedSecrets = readSecrets();
    return {
        ...DEFAULT_SETTINGS,
        ...readSettings(),
        ...storedSecrets,
        ...sanitizePublicSettings(overrides)
    };
}

module.exports = {
    SETTINGS_FILE,
    SECRETS_FILE,
    DEFAULT_SETTINGS,
    SECRET_KEYS,
    sanitizePublicSettings,
    sanitizeSecrets,
    readSettings,
    readSecrets,
    writeSecrets,
    writeSettings,
    getMergedSettings
};
