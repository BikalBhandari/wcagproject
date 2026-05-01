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
    }
};

module.exports = urlUtils;
