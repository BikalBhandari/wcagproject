const { attachWcag } = require('../utils/issueUtils');

function parseBooleanSetting(value, defaultValue = false) {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    return !['no', 'false', '0', 'off'].includes(String(value).trim().toLowerCase());
}

function parseIntegerSetting(value, defaultValue = 1) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function findContextContainer($, el, maxDepth) {
    let current = $(el).parent();
    let depth = 0;

    while (current.length && depth < maxDepth) {
        if (current.is('section, article, main, aside, figure')) {
            return current;
        }

        current = current.parent();
        depth++;
    }

    return $(el).closest('section, article, main, aside, figure');
}

function extractContext($, el, maxDepth) {
    const container = findContextContainer($, el, maxDepth);

    const heading = container.find('h1, h2, h3').first().text().trim();
    const ariaLabel = container.attr('aria-label') || '';

    const snippet = container.find('p').first().text().trim().slice(0, 120);

    return {
        heading: heading || ariaLabel || '',
        snippet
    };
}

function classifyImageRole($, el, context) {
    const className = $(el).attr('class') || '';

    // Decorative signals
    if ($(el).attr('role') === 'presentation') return 'decorative';
    if ($(el).attr('aria-hidden') === 'true') return 'decorative';
    if (className.match(/icon|logo|decorative/i)) return 'decorative';

    // Interactive
    if ($(el).closest('a, button').length) return 'interactive';

    // Person detection (DOM-based, not filename)
    if (className.match(/avatar|profile|headshot|faculty|instructor/i)) {
        return 'person';
    }

    // Informational context
    if (context.heading.toLowerCase().match(/cost|tuition|price|fee|chart|data/)) {
        return 'informational';
    }

    if ($(el).closest('figure').length) return 'informational';

    return 'general';
}

function generateAltRecommendation({ role, context }) {
    switch (role) {
        case 'decorative':
            return 'If this image is decorative, use alt="" so screen readers ignore it.';
        case 'person':
            return 'Provide a description of the person and their role (e.g., "Instructor speaking", "Student portrait"). Avoid filenames or IDs.';
        case 'informational':
            return `Describe the key information shown in the image related to "${context.heading || 'this section'}".`;
        case 'interactive':
            return 'Alt text should describe the destination or action of the link, not just the image.';
        default:
            return `Provide a concise description of the image based on its purpose in the "${context.heading || 'page'}" section.`;
    }
}

async function run(context, config = {}) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];
    const ignoreDecorative = parseBooleanSetting(config.ignoreDecorative, true);
    const scanDepth = parseIntegerSetting(config.scanDepth, 1);

    $('img').each((i, el) => {
        const alt = $(el).attr('alt');
        const src = $(el).attr('src') || 'unknown';

        const pageContext = extractContext($, el, scanDepth);
        const role = classifyImageRole($, el, pageContext);

        if (ignoreDecorative && role === 'decorative') {
            return;
        }

        const recommendation = generateAltRecommendation({
            role,
            context: pageContext
        });

        // ------------------------
        // Missing alt attribute
        // ------------------------
        if (alt === undefined) {
            issues.push(attachWcag({
                type: 'Detection',
                subType: 'Missing Alt Attribute',
                page: url,
                element: `<img src="${src}">`,
                message: 'Image is missing an alt attribute, preventing assistive technologies from conveying its purpose.',
                severity: 'high',
                recommendation,
                confidence: role === 'general' ? 'low' : 'medium',
                requiresReview: role === 'general'
            }, 'ALT_MISSING'));
        }

        // ------------------------
        // Empty alt attribute
        // ------------------------
        else if (alt.trim() === '') {
            // Only flag if NOT decorative
            if (role !== 'decorative') {
                const severity =
                    role === 'informational' || role === 'person'
                        ? 'high'
                        : 'medium';

                issues.push(attachWcag({
                    type: 'Detection',
                    subType: 'Empty Alt Attribute',
                    page: url,
                    element: `<img src="${src}">`,
                    message: 'Image has an empty alt attribute but may convey important content.',
                    severity,
                    recommendation,
                    confidence: role === 'general' ? 'low' : 'medium',
                    requiresReview: role === 'general'
                }, 'ALT_EMPTY'));
            }
        }
        // ------------------------
        // Generic / Placeholder alt
        // ------------------------
        else {
            const trimmed = alt.trim();
            const placeholderPatterns = [
                /card[-_ ]?image/i,
                /image[-_ ]?section/i,
                /placeholder/i,
                /spacer/i,
                /diploma[-_ ]?info/i,
                /next[-_ ]?start[-_ ]?date/i,
                /total[-_ ]?classes/i,
                /weeks[-_ ]?per[-_ ]?class/i,
                /total[-_ ]?credit[-_ ]?hours/i
            ];
            
            if (placeholderPatterns.some(p => p.test(trimmed))) {
                issues.push(attachWcag({
                    type: 'Detection',
                    subType: 'Placeholder Alt Text',
                    page: url,
                    element: `<img src="${src}" alt="${alt}">`,
                    message: `Image uses a generic placeholder "${alt}" as alt text, which provides no value to screen reader users.`,
                    severity: 'medium',
                    recommendation,
                    confidence: 'high',
                    requiresReview: false
                }, 'ALT_PLACEHOLDER'));
            }
        }
    });

    return issues;
}

module.exports = {
    name: 'altText',
    title: 'Alt Text Presence',
    subtitle: 'Detection Agent',
    skills: ['Deep Crawling', 'Alt Text Detection'],
    description: 'Identifies missing or empty alt attributes and common placeholder alt text on images, with role-based guidance for WCAG 1.1.1.',
    run
};
