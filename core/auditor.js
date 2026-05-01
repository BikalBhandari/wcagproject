const httpClient = require('../utils/httpClient');
const domUtils = require('../utils/domUtils');

/**
 * Fetches page content and loads DOM.
 * ONLY contains context building logic. NO audit logic.
 * 
 * @param {string} url 
 * @returns {Promise<Object>} { url, $, html } or { url, error }
 */
async function getPageContext(url) {
    try {
        const response = await httpClient.get(url);
        const $ = domUtils.load(response.data);
        
        return {
            url,
            $,
            html: response.data
        };
    } catch (error) {
        return {
            url,
            error: error.message
        };
    }
}

module.exports = { getPageContext };
