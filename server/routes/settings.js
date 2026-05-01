const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

// Get current settings
router.get('/', (req, res) => {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            return res.json({});
        }
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('Error reading settings:', err);
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

// Update settings
router.post('/', (req, res) => {
    try {
        const newSettings = req.body;
        
        // Ensure data directory exists
        const dataDir = path.dirname(SETTINGS_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Read existing settings to merge (optional, but safer)
        let currentSettings = {};
        if (fs.existsSync(SETTINGS_FILE)) {
            currentSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        }

        const mergedSettings = { ...currentSettings, ...newSettings };
        
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(mergedSettings, null, 2));
        res.json({ success: true, settings: mergedSettings });
    } catch (err) {
        console.error('Error saving settings:', err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Test Coda connection
router.post('/test-coda', async (req, res) => {
    try {
        const { codaToken, codaDocId } = req.body;
        if (!codaToken) return res.status(400).json({ error: 'Coda Token is required' });

        const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
        const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
        
        const transport = new StreamableHTTPClientTransport(
            new URL('https://coda.io/apis/mcp'),
            { requestInit: { headers: { 'Authorization': 'Bearer ' + codaToken } } }
        );

        const client = new Client(
            { name: 'test-client', version: '1.0.0' },
            { capabilities: { tools: {} } }
        );

        await client.connect(transport);
        
        // Try to list docs or just verify connection
        const result = await client.listTools({});
        await client.close();

        res.json({ success: true, message: 'Successfully connected to Coda!' });
    } catch (err) {
        console.error('Coda Test Error:', err.message);
        res.status(401).json({ error: `Connection failed: ${err.message}` });
    }
});

module.exports = router;
