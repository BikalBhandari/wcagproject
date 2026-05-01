const { attachWcag } = require('../utils/issueUtils');

/**
 * Landmark Agent
 * 
 * Audits semantic structure and landmarks:
 * 1. Missing <main>
 * 2. Missing <nav>
 * 3. Multiple <main>
 * 4. Missing landmark roles for key sections
 */

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];

    // 1. Check for <main> element
    const mainElements = $('main');
    if (mainElements.length === 0) {
        // Fallback check for role="main"
        const mainRoles = $('[role="main"]');
        if (mainRoles.length === 0) {
            issues.push(attachWcag({
                type: 'Structure',
                subType: 'Missing Main Landmark',
                page: url,
                element: 'document',
                message: 'No <main> element or role="main" found. Landmarks help users navigate the page structure.',
                severity: 'high',
                recommendation: 'Wrap the primary content of the page in a <main> element.',
                confidence: 'high',
                requiresReview: false
            }, 'LANDMARK_MISSING'));
        } else if (mainRoles.length > 1) {
            issues.push(attachWcag({
                type: 'Structure',
                subType: 'Multiple Main Landmarks',
                page: url,
                element: 'multiple elements',
                message: 'Multiple role="main" elements found. A page should have only one primary content area.',
                severity: 'medium',
                recommendation: 'Ensure only one <main> element or role="main" exists per page.',
                confidence: 'high',
                requiresReview: false
            }, 'LANDMARK_MISSING'));
        }
    } else if (mainElements.length > 1) {
        issues.push(attachWcag({
            type: 'Structure',
            subType: 'Multiple Main Landmarks',
            page: url,
            element: 'multiple <main> tags',
            message: 'Multiple <main> elements found. A page should have only one primary content area.',
            severity: 'medium',
            recommendation: 'Consolidate primary content into a single <main> element.',
            confidence: 'high',
            requiresReview: false
        }, 'LANDMARK_MISSING'));
    }

    // 2. Check for <nav> element
    const navElements = $('nav');
    if (navElements.length === 0) {
        // Check for role="navigation"
        const navRoles = $('[role="navigation"]');
        if (navRoles.length === 0) {
            issues.push(attachWcag({
                type: 'Structure',
                subType: 'Missing Navigation Landmark',
                page: url,
                element: 'document',
                message: 'No <nav> element or role="navigation" found.',
                severity: 'medium',
                recommendation: 'Use <nav> for primary or secondary navigation blocks.',
                confidence: 'medium',
                requiresReview: true
            }, 'LANDMARK_MISSING'));
        }
    }

    // 3. Check for other essential landmarks
    const header = $('header');
    if (header.length === 0 && $('[role="banner"]').length === 0) {
        issues.push(attachWcag({
            type: 'Structure',
            subType: 'Missing Header Landmark',
            page: url,
            element: 'document',
            message: 'No <header> or role="banner" found.',
            severity: 'low',
            recommendation: 'Use <header> for the site branding and top-level navigation.',
            confidence: 'medium',
            requiresReview: false
        }, 'LANDMARK_MISSING'));
    }

    const footer = $('footer');
    if (footer.length === 0 && $('[role="contentinfo"]').length === 0) {
        issues.push(attachWcag({
            type: 'Structure',
            subType: 'Missing Footer Landmark',
            page: url,
            element: 'document',
            message: 'No <footer> or role="contentinfo" found.',
            severity: 'low',
            recommendation: 'Use <footer> for site-wide information (copyright, links, etc.).',
            confidence: 'medium',
            requiresReview: false
        }, 'LANDMARK_MISSING'));
    }

    return issues;
}

module.exports = {
    name: 'landmark',
    title: 'Landmark & Structure',
    description: 'Validates semantic landmarks like <main>, <nav>, <header>, and <footer> to ensure proper page structure for screen readers.',
    run
};

