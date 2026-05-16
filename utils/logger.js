const util = require('util');

function formatValue(value) {
    if (value instanceof Error) {
        return `${value.name}: ${value.message}`;
    }

    if (typeof value === 'object' && value !== null) {
        return util.inspect(value, { depth: 5, breakLength: 120, colors: false });
    }

    return String(value);
}

function createLogger(scope = 'app') {
    function log(level, message, meta) {
        const timestamp = new Date().toISOString();
        const parts = [`[${timestamp}]`, level.toUpperCase(), scope, formatValue(message)];
        if (meta !== undefined) {
            parts.push(formatValue(meta));
        }
        // Keep logs single-line for production log collectors.
        console.log(parts.join(' | '));
    }

    return {
        debug(message, meta) {
            if (process.env.LOG_LEVEL === 'debug') {
                log('debug', message, meta);
            }
        },
        info(message, meta) {
            log('info', message, meta);
        },
        warn(message, meta) {
            log('warn', message, meta);
        },
        error(message, meta) {
            log('error', message, meta);
        }
    };
}

module.exports = { createLogger };
