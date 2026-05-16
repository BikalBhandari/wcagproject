const { getMergedSettings } = require('./settingsStore');

function getConfig() {
    const settings = getMergedSettings();

    return {
        visionKey: process.env.VISION_API_KEY || process.env.GEMINI_API_KEY || '',
        codaToken: settings.codaToken || process.env.CODA_API_TOKEN || '',
        codaDocId: settings.codaDocId || process.env.CODA_DOC_ID,
        concurrency: parseInt(settings.concurrency) || 10,
        timeout: parseInt(settings.timeout) || 30000
    };
}

function validateStartupConfig() {
    const config = getConfig();
    const warnings = [];
    const errors = [];

    if (process.env.NODE_ENV === 'production') {
        if (!process.env.APP_LOGIN_USERNAME && !process.env.AUTH_USERNAME) {
            errors.push('APP_LOGIN_USERNAME or AUTH_USERNAME must be set in production.');
        }
        if (!process.env.APP_LOGIN_PASSWORD && !process.env.AUTH_PASSWORD) {
            errors.push('APP_LOGIN_PASSWORD or AUTH_PASSWORD must be set in production.');
        }
    } else if (!process.env.APP_LOGIN_USERNAME && !process.env.AUTH_USERNAME) {
        warnings.push('Auth credentials are not configured. Login will not be usable until APP_LOGIN_USERNAME and APP_LOGIN_PASSWORD are set.');
    }

    if (!Number.isInteger(config.concurrency) || config.concurrency < 1 || config.concurrency > 50) {
        errors.push('Concurrency must resolve to an integer between 1 and 50.');
    }

    if (!Number.isInteger(config.timeout) || config.timeout < 1000 || config.timeout > 300000) {
        errors.push('Timeout must resolve to an integer between 1000 and 300000.');
    }

    return { config, warnings, errors };
}

module.exports = { getConfig, validateStartupConfig };
