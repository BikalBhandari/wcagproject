const { attachWcag } = require('../utils/issueUtils');

/**
 * Extracts a specific property from an inline style string
 */
function getStyleProperty(style, property) {
    if (!style) return null;
    const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
    const match = style.match(regex);
    return match ? match[1].trim() : null;
}

/**
 * Extracts numeric pixel value from style property
 */
function parsePx(val) {
    if (!val) return null;
    const match = val.match(/(\d+)px/);
    return match ? parseInt(match[1], 10) : null;
}

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];

    // Select clickable elements per requirements
    const selectors = 'a, button, input[type="button"], input[type="submit"]';

    $(selectors).each((i, el) => {
        const style = $(el).attr('style') || '';
        
        // Extract width and height from inline styles
        const widthStr = getStyleProperty(style, 'width');
        const heightStr = getStyleProperty(style, 'height');
        
        const width = parsePx(widthStr);
        const height = parsePx(heightStr);

        // Threshold: Check if explicitly set to < 24px
        let isTooSmall = false;
        let detectedSize = '';

        if (width !== null && width < 24) {
            isTooSmall = true;
            detectedSize += `width: ${width}px`;
        }
        if (height !== null && height < 24) {
            isTooSmall = true;
            detectedSize += (detectedSize ? ', ' : '') + `height: ${height}px`;
        }

        if (isTooSmall) {
            issues.push(attachWcag({
                type: 'Interaction',
                subType: 'Target Size',
                page: url,
                element: $.html(el).substring(0, 150),
                message: `Interactive element may be too small for accessible interaction (${detectedSize}).`,
                severity: 'medium',
                recommendation: 'Ensure touch targets are at least 24x24px to meet WCAG 2.2 Level AA requirements.',
                confidence: 'medium',
                requiresReview: true
            }, 'TARGET_SIZE'));
        } else if (width === null && height === null) {
            // Heuristic for elements likely to be small (e.g. icon-only links)
            const text = $(el).text().trim();
            const hasIcon = $(el).find('i, svg, img, span[class*="icon"]').length > 0;
            
            if (!text && hasIcon) {
                issues.push(attachWcag({
                    type: 'Interaction',
                    subType: 'Target Size',
                    page: url,
                    element: $.html(el).substring(0, 150),
                    message: 'Interactive element may be too small for accessible interaction.',
                    severity: 'medium',
                    recommendation: 'Ensure touch targets are at least 24x24px.',
                    confidence: 'low',
                    requiresReview: true
                }, 'TARGET_SIZE'));
            }
        }
    });

    return issues;
}

module.exports = {
    name: 'targetSize',
    title: 'Touch Target Heuristics',
    subtitle: 'Heuristic Agent',
    skills: ['Inline Geometry', 'Icon-Only Detection'],
    description: 'Flags clickable elements with inline width/height below 24px and icon-only controls that may be too small. It does not measure rendered layout or spacing between targets.',
    run
};
