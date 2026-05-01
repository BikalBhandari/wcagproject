/**
 * Validates and normalizes an accessibility issue against the strict schema.
 * 
 * @param {Object} issue - The raw issue from an agent.
 * @returns {Object} - The normalized issue.
 * @throws {Error} - If any required fields are missing or invalid.
 */
function validateIssue(issue) {
    const requiredFields = ['type', 'subType', 'page', 'element', 'message', 'severity', 'wcag'];
    
    // 1. Check for missing fields
    for (const field of requiredFields) {
        if (!issue[field]) {
            console.warn(`⚠️ Issue fails validation: Missing required field "${field}"`, issue);
            throw new Error(`Invalid Issue Schema: Missing required field "${field}"`);
        }
    }

    // 2. Validate Severity
    const validSeverities = ['high', 'medium', 'low'];
    if (!validSeverities.includes(issue.severity)) {
        console.warn(`⚠️ Issue fails validation: Invalid severity "${issue.severity}"`, issue);
        throw new Error(`Invalid Issue Schema: Severity must be one of ${validSeverities.join(', ')}`);
    }

    // 3. Validate WCAG (must be array)
    if (!Array.isArray(issue.wcag)) {
        console.warn('⚠️ Issue fails validation: wcag must be an array', issue);
        throw new Error('Invalid Issue Schema: wcag must be an array');
    }

    // 4. Return Normalized Issue (ensure all required fields and optional ones are present)
    return {
        type: issue.type,
        subType: issue.subType,
        page: issue.page,
        element: issue.element,
        message: issue.message,
        severity: issue.severity,
        wcag: issue.wcag,
        helpUrl: issue.helpUrl || '',
        confidence: issue.confidence || 'high',
        requiresReview: !!issue.requiresReview,
        agent: issue.agent || 'unknown'
    };
}

module.exports = { validateIssue };
