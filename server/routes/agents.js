const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', '..', 'config', 'agents.config.js');

// Helper to read config
function readConfig() {
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
}

// Helper to write config
function writeConfig(config) {
    const content = `module.exports = ${JSON.stringify(config, null, 4)};\n`;
    fs.writeFileSync(configPath, content, 'utf8');
}

// Get all agents
router.get('/', (req, res) => {
    try {
        const config = readConfig();
        res.json(config.agents);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read agents config' });
    }
});

// Toggle agent status
router.post('/toggle', (req, res) => {
    const { name, enabled } = req.body;
    try {
        const config = readConfig();
        const agent = config.agents.find(a => a.name === name);
        if (agent) {
            agent.enabled = enabled;
            writeConfig(config);
            res.json({ success: true, agent });
        } else {
            res.status(404).json({ error: 'Agent not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to update agent status' });
    }
});

// Toggle all agents
router.post('/toggle-all', (req, res) => {
    const { enabled } = req.body;
    try {
        const config = readConfig();
        config.agents.forEach(a => a.enabled = enabled);
        writeConfig(config);
        res.json({ success: true, count: config.agents.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update all agents' });
    }
});

module.exports = router;
