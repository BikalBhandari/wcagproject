const { attachWcag } = require('../utils/issueUtils');

const REDUNDANT_PHRASES = [
    /^image of/i, /^photo of/i, /^picture of/i, /^graphic of/i,
    /^an image of/i, /^a photo of/i, /^a picture of/i, /^a graphic of/i
];

const GENERIC_TERMS = [
    /^image$/i, /^img$/i, /^photo$/i, /^picture$/i, /^logo$/i, /^icon$/i,
    /^spacer$/i, /^placeholder$/i, /^graphic$/i,
    /^banner$/i, /^thumbnail$/i,
    /card[-_ ]?image/i,
    /image[-_ ]?section/i,
    /diploma[-_ ]?info/i,
    /next[-_ ]?start[-_ ]?date/i,
    /total[-_ ]?classes/i,
    /weeks[-_ ]?per[-_ ]?class/i,
    /total[-_ ]?credit[-_ ]?hours/i
];

const FILENAME_PATTERN = /^[a-z0-9_\-]+\.(jpg|png|gif|svg|jpeg|webp)$/i;

const SEVERITY_MAP = {
    'redundant': 'low',
    'generic': 'medium',
    'filename': 'medium',
    'too-short': 'medium',
    'too-long': 'low',
    'empty-misuse': 'high'
};

const WCAG_KEY_MAP = {
    'redundant': 'ALT_REDUNDANT',
    'generic': 'ALT_PLACEHOLDER',
    'filename': 'ALT_PLACEHOLDER',
    'too-short': 'ALT_PLACEHOLDER',
    'too-long': 'ALT_PLACEHOLDER',
    'empty-misuse': 'ALT_EMPTY'
};

// ------------------------
// Context Extraction
// ------------------------
function extractContext($, el) {
    const container = $(el).closest('section, article, main, aside');

    const heading = container.find('h1, h2, h3').first().text().trim();
    const ariaLabel = container.attr('aria-label') || '';

    const snippet = container.find('p').first().text().trim().slice(0, 120);

    return {
        heading: heading || ariaLabel || '',
        snippet
    };
}

// ------------------------
// Role Classification
// ------------------------
function classifyImageRole($, el, context) {
    const src = $(el).attr('src') || '';
    const className = $(el).attr('class') || '';

    if ($(el).attr('role') === 'presentation') return 'decorative';
    if ($(el).attr('aria-hidden') === 'true') return 'decorative';

    if ($(el).closest('button, a').length) return 'interactive';

    if (className.match(/icon|logo/i)) return 'decorative';

    if (className.match(/avatar|profile|headshot/i)) return 'person';

    if (context.heading.toLowerCase().match(/cost|tuition|price|chart|data/)) {
        return 'informational';
    }

    if ($(el).closest('figure').length) return 'informational';

    return 'general';
}

// ------------------------
// Recommendation Generator
// ------------------------
function generateRecommendation(reason, role, context, alt) {
    const base = {
        decorative: 'If this image is decorative, use alt="" so screen readers ignore it.',
        person: 'Describe the person and their role (e.g., "Instructor speaking", "Student portrait"). Avoid filenames.',
        informational: `Describe the key information shown in the image related to "${context.heading || 'this section'}".`,
        interactive: 'Alt text should describe the destination or action of the link.',
        general: `Provide a concise description of the image based on its purpose in the "${context.heading || 'page'}" section.`
    };

    const guidance = base[role] || base.general;

    switch (reason) {
        case 'redundant':
            return `Remove redundant phrases like "image of". ${guidance}`;

        case 'generic':
            return `Alt text "${alt}" is too generic. ${guidance}`;

        case 'filename':
            return `Replace filename-like alt text with a human-readable description. ${guidance}`;

        case 'too-short':
            return `Alt text "${alt}" is too short. Expand it to be more descriptive. ${guidance}`;

        case 'too-long':
            return `Alt text is too long. Keep it concise. Use aria-describedby for extended descriptions if needed.`;

        case 'empty-misuse':
            return `Alt text is empty but image may not be decorative. ${guidance}`;

        default:
            return guidance;
    }
}

// ------------------------
// Quality Evaluation
// ------------------------
function evaluateQuality(alt, src, context, role) {
    const trimmed = alt.trim();
    const issues = [];

    // EMPTY misuse (important edge case)
    if (trimmed === '') {
        if (role !== 'decorative') {
            issues.push({ reason: 'empty-misuse' });
        }
        return issues;
    }

    // Redundant phrases
    if (REDUNDANT_PHRASES.some(pattern => pattern.test(trimmed))) {
        issues.push({ reason: 'redundant' });
    }

    // Generic terms
    if (GENERIC_TERMS.some(pattern => pattern.test(trimmed))) {
        issues.push({ reason: 'generic' });
    }

    // Filename detection (tightened)
    if (FILENAME_PATTERN.test(trimmed)) {
        issues.push({ reason: 'filename' });
    }

    // Too short
    if (trimmed.length > 0 && trimmed.length < 5 && !GENERIC_TERMS.some(p => p.test(trimmed))) {
        issues.push({ reason: 'too-short' });
    }

    // Too long
    if (trimmed.length > 150) {
        issues.push({ reason: 'too-long' });
    }

    return issues;
}

// ------------------------
// Agent Runner
// ------------------------
async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];

    $('img').each((i, el) => {
        const alt = $(el).attr('alt');
        const src = $(el).attr('src') || 'unknown';

        if (alt === undefined) return; // handled by altTextAgent

        const pageContext = extractContext($, el);
        const role = classifyImageRole($, el, pageContext);

        const qualityIssues = evaluateQuality(alt, src, pageContext, role);

        qualityIssues.forEach(q => {
            const recommendation = generateRecommendation(
                q.reason,
                role,
                pageContext,
                alt
            );

            const wcagKey = WCAG_KEY_MAP[q.reason] || 'ALT_PLACEHOLDER';

            issues.push(attachWcag({
                type: 'Analysis',
                subType: q.reason.replace('-', ' ').toUpperCase(),
                page: url,
                element: `<img src="${src}" alt="${alt}">`,
                message: `Alt text quality issue: ${q.reason.replace('-', ' ')}`,
                severity: SEVERITY_MAP[q.reason] || 'low',
                recommendation,
                confidence: role === 'general' ? 'low' : 'medium',
                requiresReview: role === 'general'
            }, wcagKey));
        });
    });

    return issues;
}

module.exports = {
    name: 'altQuality',
    title: 'Alt Text Quality',
    subtitle: 'Analysis Agent',
    skills: ['Image Analysis', 'Contextual Heuristics'],
    description: 'Evaluates existing alt text for redundant phrasing, generic wording, filename-like text, and length issues using lightweight contextual heuristics.',
    run
};
