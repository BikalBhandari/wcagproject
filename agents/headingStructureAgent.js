const { attachWcag } = require('../utils/issueUtils');

/**
 * Heading Structure Agent
 * Checks for missing h1, multiple h1, and skipped heading levels.
 */

function generateHeadingRecommendation(issueType, details) {
    switch (issueType) {
        case 'missing-h1':
            return 'Every page should have exactly one H1 heading to define the main content.';
        case 'multiple-h1':
            return 'Use only one H1 heading per page for clarity and SEO. Use H2-H6 for sub-sections.';
        case 'skipped-level':
            return `Headings should follow a sequential order (e.g., H${details.prev} should be followed by H${details.prev + 1} or a higher level heading). Avoid skipping levels like H${details.prev} to H${details.curr}.`;
        default:
            return 'Maintain a proper heading hierarchy for accessibility and SEO.';
    }
}

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];
    
    // 1. Check for h1 issues
    const h1s = $('h1');
    if (h1s.length === 0) {
        issues.push(attachWcag({
            type: 'Structure',
            subType: 'Missing H1',
            page: url,
            element: '<body>',
            message: 'CRITICAL: Page is missing an H1 heading.',
            severity: 'high',
            recommendation: generateHeadingRecommendation('missing-h1'),
            confidence: 'high',
            requiresReview: false
        }, 'HEADING_STRUCTURE'));
    } else if (h1s.length > 1) {
        issues.push(attachWcag({
            type: 'Structure',
            subType: 'Multiple H1s',
            page: url,
            element: 'multiple <h1> tags',
            message: 'WARNING: Multiple H1 headings found on page.',
            severity: 'medium',
            recommendation: generateHeadingRecommendation('multiple-h1'),
            confidence: 'high',
            requiresReview: false
        }, 'HEADING_STRUCTURE'));
    }

    // 2. Check for skipped heading levels
    const headings = $('h1, h2, h3, h4, h5, h6');
    let prevLevel = 0;

    headings.each((i, el) => {
        const tagName = el.tagName.toLowerCase();
        const currentLevel = parseInt(tagName.substring(1));

        if (prevLevel > 0 && currentLevel > prevLevel + 1) {
            issues.push(attachWcag({
                type: 'Structure',
                subType: 'Skipped Heading Level',
                page: url,
                element: $.html(el),
                message: `WARNING: Skipped heading level. ${tagName} follows H${prevLevel}.`,
                severity: 'medium',
                recommendation: generateHeadingRecommendation('skipped-level', { prev: prevLevel, curr: currentLevel }),
                confidence: 'high',
                requiresReview: false
            }, 'HEADING_STRUCTURE'));
        }
        
        prevLevel = currentLevel;
    });

    return issues;
}

module.exports = {
    name: 'headingStructure',
    title: 'Heading Structure',
    description: 'Checks for missing or multiple H1 headings and skipped heading levels in the visible document outline.',
    run
};
