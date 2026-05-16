const fs = require('fs');
const path = require('path');

const RUNTIME_DIR = path.join(__dirname, '..', 'data', 'runtime');

function ensureDir() {
    if (!fs.existsSync(RUNTIME_DIR)) {
        fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    }
}

function readJson(filePath, fallbackValue) {
    try {
        if (!fs.existsSync(filePath)) {
            return fallbackValue;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.trim()) {
            return fallbackValue;
        }

        return JSON.parse(content);
    } catch (_) {
        return fallbackValue;
    }
}

function writeJson(filePath, value) {
    ensureDir();

    const payload = `${JSON.stringify(value, null, 2)}\n`;
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, payload, 'utf8');
    fs.renameSync(tempPath, filePath);
}

module.exports = {
    RUNTIME_DIR,
    ensureDir,
    readJson,
    writeJson
};
