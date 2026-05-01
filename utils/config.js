const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

function getConfig() {
    let settings = {};
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('Error reading settings file:', err);
    }

    return {
        visionKey: settings.visionKey || process.env.VISION_API_KEY,
        codaToken: settings.codaToken || process.env.CODA_API_TOKEN,
        codaDocId: settings.codaDocId || process.env.CODA_DOC_ID,
        concurrency: parseInt(settings.concurrency) || 10,
        timeout: parseInt(settings.timeout) || 30000
    };
}

module.exports = { getConfig };
