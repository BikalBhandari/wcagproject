const { attachWcag } = require('../utils/issueUtils');

/**
 * Link Text Agent
 * 
 * Focuses on link accessibility:
 * 1. Non-descriptive text (e.g., "click here", "read more")
 * 2. Empty links
 * 3. Duplicate link text pointing to different URLs
 */

const NON_DESCRIPTIVE_TEXT = [
    'click here',
    'read more',
    'learn more',
    'more',
    'details',
    'here',
    'link',
    'go',
    'view more'
];

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];
    const linkTextMap = new Map(); // text -> href

    $('a').each((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        const href = $(el).attr('href');
        const ariaLabel = $(el).attr('aria-label');
        const ariaLabelledBy = $(el).attr('aria-labelledby');

        // 1. Empty Links
        if (!text && !ariaLabel && !ariaLabelledBy && !$(el).find('img[alt]').length) {
            issues.push(attachWcag({
                type: 'Navigation',
                subType: 'Empty Link',
                page: url,
                element: $(el).prop('outerHTML').substring(0, 200),
                message: 'Link contains no visible text or accessible name (aria-label/alt).',
                severity: 'high',
                recommendation: 'Add descriptive text or an aria-label to the link.',
                confidence: 'high',
                requiresReview: false
            }, 'ACCESSIBLE_NAME'));
            return; // Skip further checks for empty links
        }

        // 2. Non-descriptive Text
        if (text && NON_DESCRIPTIVE_TEXT.includes(text) && !ariaLabel) {
            issues.push(attachWcag({
                type: 'Navigation',
                subType: 'Non-Descriptive Link Text',
                page: url,
                element: $(el).prop('outerHTML').substring(0, 200),
                message: `Link uses generic text "${text}" which lacks context for screen reader users.`,
                severity: 'medium',
                recommendation: 'Use descriptive text that explains the link destination (e.g., "Read more about our services").',
                confidence: 'high',
                requiresReview: false
            }, 'LINK_PURPOSE'));
        }

        // 3. Duplicate Link Text to Different URLs
        if (text && href && href !== '#' && !href.startsWith('javascript:')) {
            const absoluteHref = href.startsWith('http') ? href : new URL(href, url).href;
            
            if (linkTextMap.has(text)) {
                const previousHref = linkTextMap.get(text);
                if (previousHref !== absoluteHref) {
                    issues.push(attachWcag({
                        type: 'Navigation',
                        subType: 'Ambiguous Link Text',
                        page: url,
                        element: `Text: "${text}" | URL: ${absoluteHref}`,
                        message: `Multiple links have the same text "${text}" but point to different destinations.`,
                        severity: 'medium',
                        recommendation: 'Ensure links with the same text point to the same destination, or provide unique text/labels for each.',
                        confidence: 'medium',
                        requiresReview: true
                    }, 'LINK_PURPOSE'));
                }
            } else {
                linkTextMap.set(text, absoluteHref);
            }
        }
    });

    return issues;
}

module.exports = {
    name: 'linkText',
    title: 'Link Text Accessibility',
    description: 'Checks links for empty text, generic link text, and duplicate link text that points to different destinations.',
    run
};
