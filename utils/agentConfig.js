const fs = require('fs');
const path = require('path');
const { createLogger } = require('./logger');

const DATA_DIR = path.join(__dirname, '..', 'data');
const AGENT_CONFIG_FILE = path.join(DATA_DIR, 'agents.json');
const DEFAULT_AGENT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'agents.config.js');
const logger = createLogger('agents-config');

function getDefaultAgentConfig() {
    delete require.cache[require.resolve(DEFAULT_AGENT_CONFIG_PATH)];
    return require(DEFAULT_AGENT_CONFIG_PATH);
}

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function readAgentConfig() {
    try {
        if (fs.existsSync(AGENT_CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(AGENT_CONFIG_FILE, 'utf8'));
        }
    } catch (err) {
        logger.warn('Could not read agent config file', err);
    }

    return getDefaultAgentConfig();
}

function writeAgentConfig(config) {
    ensureDataDir();

    const payload = JSON.stringify(config, null, 4);
    const tempPath = `${AGENT_CONFIG_FILE}.tmp`;
    fs.writeFileSync(tempPath, `${payload}\n`, 'utf8');
    fs.renameSync(tempPath, AGENT_CONFIG_FILE);
}

module.exports = {
    AGENT_CONFIG_FILE,
    readAgentConfig,
    writeAgentConfig,
    getDefaultAgentConfig
};
