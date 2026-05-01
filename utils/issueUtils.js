const wcagMap = require('./wcagMap');

const BASE_URL = 'https://www.w3.org/TR/WCAG21/#';

/**
 * Normalizes issue severity based on WCAG level.
 * @param {Object} issue 
 * @returns {Object}
 */
function normalizeSeverity(issue) {
    const primaryRule = issue.wcag?.[0];
    if (!primaryRule) return issue;

    // If it's a Level A failure but severity is low, upgrade to medium
    if (primaryRule.level === 'A' && issue.severity === 'low') {
        issue.severity = 'medium';
    }

    return issue;
}

/**
 * Attaches WCAG metadata to an issue object.
 * 
 * @param {Object} issue - The issue object to enhance.
 * @param {string} key - The key from wcagMap to use.
 * @returns {Object} The enhanced issue object.
 */
function attachWcag(issue, key) {
    const rules = wcagMap[key];

    if (!rules) {
        throw new Error(`Invalid WCAG key: ${key}`);
    }

    const wcag = rules.map(rule => ({
        criterion: rule.criterion,
        name: rule.name,
        level: rule.level
    }));

    const helpUrls = rules.map(rule => `${BASE_URL}${rule.slug}`);

    const enhancedIssue = {
        ...issue,
        wcag,
        helpUrl: helpUrls.length === 1 ? helpUrls[0] : helpUrls
    };

    return normalizeSeverity(enhancedIssue);
}

module.exports = {
    attachWcag,
    normalizeSeverity
};
