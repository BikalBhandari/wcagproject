const { createRateLimit, checkRateLimit, getClientKey } = require('./rateLimitStore');

module.exports = {
    createRateLimit,
    checkRateLimit,
    getClientKey
};
