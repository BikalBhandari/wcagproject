const path = require('path');

const urlUtils = {
    normalize(url) {
        try {
            const parsed = new URL(url);
            return parsed.toString();
        } catch (e) {
            return url;
        }
    },

    getTimestamp() {
        const now = new Date();
        return now.toISOString()
            .replace(/T/, '-')
            .replace(/\..+/, '')
            .replace(/:/g, '')
            .replace(/-/g, '');
    },

    getDomain(url) {
        try {
            const parsed = new URL(url);
            return parsed.hostname;
        } catch (e) {
            return url;
        }
    }
};

module.exports = urlUtils;
