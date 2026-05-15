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
    // Stringify with formatting, but ensure it's valid JS
    const content = `module.exports = ${JSON.stringify(config, null, 4)};\n`;
    fs.writeFileSync(configPath, content, 'utf8');
}

// Get all agents
router.get('/', (req, res) => {
    try {
        const config = readConfig();
        const registry = require('../../agents/index');
        const categories = registry._categories || {};
        
        const enrichedAgents = config.agents.map(a => {
            const meta = registry[a.name] || {};
            const category = Object.entries(categories).find(([, agents]) => agents.includes(a.name))?.[0] || 'legacy';
            return {
                ...a,
                title: meta.title || a.name,
                subtitle: meta.subtitle || '',
                description: meta.description || '',
                skills: meta.skills || [],
                category
            };
        });
        res.json(enrichedAgents);
    } catch (err) {
        console.error('Error fetching agents:', err);
        res.status(500).json({ error: 'Failed to read agents config' });
    }
});

// Update agent configuration
router.post('/config', (req, res) => {
    const { name, config: agentConfig } = req.body;
    try {
        const config = readConfig();
        const agent = config.agents.find(a => a.name === name);
        if (agent) {
            agent.config = agentConfig;
            writeConfig(config);
            res.json({ success: true, agent });
        } else {
            res.status(404).json({ error: 'Agent not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to update agent configuration' });
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

// Get WCAG Mapping
router.get('/wcag-map', (req, res) => {
    try {
        const wcagMap = require('../../utils/wcagMap');
        res.json(wcagMap);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read WCAG map' });
    }
});

module.exports = router;
