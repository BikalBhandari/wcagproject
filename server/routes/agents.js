const express = require('express');
const router = express.Router();
const { readAgentConfig, writeAgentConfig } = require('../../utils/agentConfig');
const { validateAgentConfigPayload } = require('../../utils/requestValidation');
const { createRateLimit } = require('../../utils/rateLimit');
const { createLogger } = require('../../utils/logger');

const agentWriteLimit = createRateLimit({ limit: 20, windowMs: 5 * 60 * 1000, keyPrefix: 'agents-write' });
const logger = createLogger('agents');

// Get all agents
router.get('/', (req, res) => {
    try {
        const config = readAgentConfig();
        const registry = require('../../agents/index');
        const categories = registry._categories || {};
        
        const enrichedAgents = config.agents.map(a => {
            const meta = registry[a.name] || {};
            const category = Object.entries(categories).find(([, agents]) => agents.includes(a.name))?.[0] || '';
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
        logger.error('Error fetching agents', err);
        res.status(500).json({ error: 'Failed to read agents config' });
    }
});

// Update agent configuration
router.post('/config', agentWriteLimit, (req, res) => {
    const { name, config: agentConfig } = req.body || {};
    const configResult = validateAgentConfigPayload(agentConfig);

    if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Agent name is required' });
    }

    if (!configResult.valid) {
        return res.status(400).json({ error: configResult.error });
    }

    try {
        const config = readAgentConfig();
        const agent = config.agents.find(a => a.name === name.trim());
        if (agent) {
            agent.config = configResult.value;
            writeAgentConfig(config);
            res.json({ success: true, agent });
        } else {
            res.status(404).json({ error: 'Agent not found' });
        }
    } catch (err) {
        logger.error('Failed to update agent configuration', err);
        res.status(500).json({ error: 'Failed to update agent configuration' });
    }
});

// Toggle agent status
router.post('/toggle', agentWriteLimit, (req, res) => {
    const { name, enabled } = req.body || {};
    if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Agent name is required' });
    }
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Enabled must be a boolean' });
    }

    try {
        const config = readAgentConfig();
        const agent = config.agents.find(a => a.name === name.trim());
        if (agent) {
            agent.enabled = enabled;
            writeAgentConfig(config);
            res.json({ success: true, agent });
        } else {
            res.status(404).json({ error: 'Agent not found' });
        }
    } catch (err) {
        logger.error('Failed to update agent status', err);
        res.status(500).json({ error: 'Failed to update agent status' });
    }
});

// Toggle all agents
router.post('/toggle-all', agentWriteLimit, (req, res) => {
    const { enabled } = req.body || {};
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Enabled must be a boolean' });
    }

    try {
        const config = readAgentConfig();
        config.agents.forEach(a => a.enabled = enabled);
        writeAgentConfig(config);
        res.json({ success: true, count: config.agents.length });
    } catch (err) {
        logger.error('Failed to update all agents', err);
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
