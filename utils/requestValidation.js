const fs = require('fs');
const path = require('path');

const SCOPE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9 _.-]{0,79}$/;
const SCOPE_FILE_RE = /^[a-zA-Z0-9._-]+\.json$/;
const AGENT_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;

function isPlainObject(value) {
    return !!value && Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeScopeFile(file) {
    const name = path.basename(String(file || ''));
    if (!SCOPE_FILE_RE.test(name)) {
        return null;
    }
    return name;
}

function validateScopeName(name) {
    const trimmed = String(name || '').trim();
    if (!SCOPE_NAME_RE.test(trimmed)) {
        return { valid: false, error: 'Scope name must be 1-80 characters and contain only letters, numbers, spaces, periods, underscores, or hyphens.' };
    }
    return { valid: true, value: trimmed };
}

function validateUrlList(urls) {
    if (!Array.isArray(urls) || urls.length === 0) {
        return { valid: false, error: 'URLs array is required and must contain at least one URL.' };
    }

    if (urls.length > 500) {
        return { valid: false, error: 'URLs array is too large. Limit scopes to 500 URLs.' };
    }

    for (const url of urls) {
        if (typeof url !== 'string' || url.trim().length === 0) {
            return { valid: false, error: 'Each URL must be a non-empty string.' };
        }

        try {
            const parsed = new URL(url.trim());
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return { valid: false, error: 'URLs must use http or https.' };
            }
        } catch (_) {
            return { valid: false, error: `Invalid URL: ${url}` };
        }
    }

    return { valid: true, value: urls.map(url => url.trim()) };
}

function validateSitemapUrl(url) {
    if (typeof url !== 'string' || url.trim().length === 0) {
        return { valid: false, error: 'Sitemap URL is required.' };
    }

    try {
        const parsed = new URL(url.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { valid: false, error: 'Sitemap URL must use http or https.' };
        }
        return { valid: true, value: parsed.toString() };
    } catch (_) {
        return { valid: false, error: 'Sitemap URL must be a valid URL.' };
    }
}

function validateAgentConfigPayload(payload) {
    if (!isPlainObject(payload)) {
        return { valid: false, error: 'Agent config must be an object.' };
    }

    const entries = Object.entries(payload);
    if (entries.length > 30) {
        return { valid: false, error: 'Agent config has too many fields.' };
    }

    for (const [key, value] of entries) {
        if (!AGENT_NAME_RE.test(String(key))) {
            return { valid: false, error: `Invalid config field name: ${key}` };
        }

        const type = typeof value;
        if (!['string', 'number', 'boolean'].includes(type)) {
            return { valid: false, error: `Invalid config value for ${key}. Use strings, numbers, or booleans.` };
        }

        if (type === 'string' && value.length > 500) {
            return { valid: false, error: `Config value for ${key} is too long.` };
        }
    }

    return { valid: true, value: payload };
}

function validateAuditRequest(data, options = {}) {
    if (!isPlainObject(data)) {
        return { valid: false, error: 'Audit request must be an object.' };
    }

    const file = normalizeScopeFile(data.file);
    if (!file) {
        return { valid: false, error: 'Invalid scope file.' };
    }

    const allowedAgents = Array.isArray(options.allowedAgents) ? new Set(options.allowedAgents) : null;

    if (data.agents !== undefined) {
        if (!Array.isArray(data.agents)) {
            return { valid: false, error: 'Agents must be an array when provided.' };
        }

        if (data.agents.length === 0) {
            return { valid: false, error: 'Select at least one agent.' };
        }

        if (data.agents.length > 20) {
            return { valid: false, error: 'Too many agents selected.' };
        }

        for (const agent of data.agents) {
            if (!AGENT_NAME_RE.test(String(agent || ''))) {
                return { valid: false, error: `Invalid agent name: ${agent}` };
            }
            if (allowedAgents && !allowedAgents.has(agent)) {
                return { valid: false, error: `Unknown agent: ${agent}` };
            }
        }
    }

    return { valid: true, value: { ...data, file } };
}

function validateSettingsPayload(payload) {
    if (!isPlainObject(payload)) {
        return { valid: false, error: 'Settings payload must be an object.' };
    }

    const sanitized = {};
    if (payload.codaToken !== undefined) {
        if (typeof payload.codaToken !== 'string') {
            return { valid: false, error: 'Coda token must be a string.' };
        }
        sanitized.codaToken = payload.codaToken.trim();
    }

    if (payload.codaDocId !== undefined) {
        if (typeof payload.codaDocId !== 'string') {
            return { valid: false, error: 'Coda Doc ID must be a string.' };
        }
        sanitized.codaDocId = payload.codaDocId.trim();
    }

    if (payload.concurrency !== undefined) {
        const concurrency = Number(payload.concurrency);
        if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 50) {
            return { valid: false, error: 'Concurrency must be an integer between 1 and 50.' };
        }
        sanitized.concurrency = concurrency;
    }

    if (payload.timeout !== undefined) {
        const timeout = Number(payload.timeout);
        if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 300000) {
            return { valid: false, error: 'Timeout must be an integer between 1000 and 300000.' };
        }
        sanitized.timeout = timeout;
    }

    const allowedKeys = new Set(['codaToken', 'codaDocId', 'concurrency', 'timeout']);
    for (const key of Object.keys(payload)) {
        if (!allowedKeys.has(key)) {
            return { valid: false, error: `Unknown settings field: ${key}` };
        }
    }

    return { valid: true, value: sanitized };
}

function listJsonFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(file => SCOPE_FILE_RE.test(file));
}

module.exports = {
    isPlainObject,
    normalizeScopeFile,
    validateScopeName,
    validateUrlList,
    validateSitemapUrl,
    validateAgentConfigPayload,
    validateAuditRequest,
    validateSettingsPayload,
    listJsonFiles
};
