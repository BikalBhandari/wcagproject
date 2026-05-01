const axios = require('axios');
const http = require('http');
const https = require('https');

const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Use persistent agents for keep-alive
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

const httpClient = {
    async get(url, options = {}) {
        try {
            const response = await axios.get(url, {
                headers: { ...DEFAULT_HEADERS, ...options.headers },
                timeout: options.timeout || 15000,
                httpAgent,
                httpsAgent,
                ...options
            });
            return response;
        } catch (error) {
            throw new Error(`HTTP GET failed for ${url}: ${error.message}`);
        }
    }
};

module.exports = httpClient;
