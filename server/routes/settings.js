const express = require('express');
const router = express.Router();
const { readSettings, readSecrets, writeSettings, writeSecrets, getMergedSettings } = require('../../utils/settingsStore');
const { getConfig } = require('../../utils/config');
const { validateSettingsPayload } = require('../../utils/requestValidation');
const { createRateLimit } = require('../../utils/rateLimit');
const { createLogger } = require('../../utils/logger');

const settingsWriteLimit = createRateLimit({ limit: 20, windowMs: 5 * 60 * 1000, keyPrefix: 'settings-write' });
const auditTestLimit = createRateLimit({ limit: 5, windowMs: 5 * 60 * 1000, keyPrefix: 'settings-test' });
const logger = createLogger('settings');

// Get current settings
router.get('/', (req, res) => {
    try {
        res.json(readSettings());
    } catch (err) {
        logger.error('Error reading settings', err);
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

// Update settings
router.post('/', settingsWriteLimit, (req, res) => {
    try {
        const payloadResult = validateSettingsPayload(req.body);
        if (!payloadResult.valid) {
            return res.status(400).json({ error: payloadResult.error });
        }

        const { codaToken, ...rest } = payloadResult.value;
        const mergedSettings = getMergedSettings(rest);
        const publicSettings = { ...mergedSettings };
        delete publicSettings.codaToken;
        writeSettings(publicSettings);
        if (codaToken !== undefined) {
            writeSecrets({ ...readSecrets(), codaToken });
        }
        res.json({
            success: true,
            settings: {
                ...publicSettings,
                hasCodaToken: Boolean(codaToken !== undefined ? codaToken : readSecrets().codaToken)
            }
        });
    } catch (err) {
        logger.error('Error saving settings', err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Test Coda connection
router.post('/test-coda', auditTestLimit, async (req, res) => {
    let client = null;
    try {
        const config = getConfig();
        const token = config.codaToken;
        if (!token) return res.status(400).json({ error: 'Add a Coda token in Settings before testing.' });

        const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
        const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
        
        const transport = new StreamableHTTPClientTransport(
            new URL('https://coda.io/apis/mcp'),
            { requestInit: { headers: { 'Authorization': 'Bearer ' + token } } }
        );

        client = new Client(
            { name: 'test-client', version: '1.0.0' },
            { capabilities: { tools: {} } }
        );

        await client.connect(transport);
        
        await client.listTools({});

        res.json({ success: true, message: 'Successfully connected to Coda!' });
    } catch (err) {
        logger.error('Coda test error', err);
        res.status(401).json({ error: `Connection failed: ${err.message}` });
    } finally {
        if (client) {
            try {
                await client.close();
            } catch (_) {}
        }
    }
});

module.exports = router;
