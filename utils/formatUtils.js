'use strict';

/**
 * utils/formatUtils.js
 * 
 * Shared utilities for formatting audit data for reports.
 */

/**
 * Formats WCAG rules array into a clean string.
 * @param {Array|Object|string} wcag 
 * @returns {string}
 */
function formatWcag(wcag) {
    if (!wcag) return '';
    if (typeof wcag === 'string') return wcag;
    
    const rules = Array.isArray(wcag) ? wcag : [wcag];
    
    return rules
        .map(rule => {
            if (typeof rule === 'string') return rule;
            const parts = [];
            if (rule.criterion) parts.push(rule.criterion);
            if (rule.level) parts.push(`(${rule.level})`);
            if (rule.version) parts.push(`[${rule.version}]`);
            return parts.length > 0 ? parts.join(' ') : JSON.stringify(rule);
        })
        .join(', ');
}

/**
 * Sanitizes element HTML strings, specifically truncating long data URIs.
 * @param {string} element 
 * @returns {string}
 */
function sanitizeElement(element) {
    if (!element || typeof element !== 'string') return '';

    // Specifically target long data URIs in src attributes
    // Matches src="data:..." and src='data:...'
    // Uses [\s\S]+? to match any character (including newlines) non-greedily
    return element.replace(/src=(["'])(data:[\s\S]+?)\1/gi, (match, quote, data) => {
        if (data.length > 50) {
            return `src=${quote}${data.slice(0, 40)}... [data-uri]${quote}`;
        }
        return match;
    });
}

/**
 * Escapes a string for safe HTML insertion.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Formats a timestamp into a human-readable string.
 * @param {Date|string} date 
 * @returns {string}
 */
function formatTimestamp(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return new Date().toLocaleString();
    return d.toLocaleString();
}

module.exports = {
    formatWcag,
    sanitizeElement,
    formatTimestamp,
    escapeHtml
};
