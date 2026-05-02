const { attachWcag } = require('../utils/issueUtils');

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];

    // Focusable elements per WCAG requirements
    const selectors = 'a[href], button, input, select, textarea, [tabindex]';

    $(selectors).each((i, el) => {
        const style = $(el).attr('style') || '';
        const tabindexAttr = $(el).attr('tabindex');
        const tabindex = parseInt(tabindexAttr, 10);

        // 1. Detect missing focus styles
        // Heuristic: Check for explicit outline: none or outline: 0 in inline styles
        if (style.match(/outline:\s*(none|0)/i)) {
            issues.push(attachWcag({
                type: 'Navigation',
                subType: 'Focus Visible',
                page: url,
                element: $.html(el).substring(0, 150),
                message: 'Focusable element explicitly disables focus outline (outline: none).',
                severity: 'high',
                recommendation: 'Ensure focus state is clearly visible (e.g., outline, border, background change). Avoid disabling the default browser outline unless replaced by a custom one.',
                confidence: 'medium',
                requiresReview: true
            }, 'FOCUS_VISIBLE'));
        }

        // 2. Detect tabindex order issues
        if (!isNaN(tabindex) && tabindex > 0) {
            issues.push(attachWcag({
                type: 'Navigation',
                subType: 'Focus Order',
                page: url,
                element: $.html(el).substring(0, 150),
                message: `Element has positive tabindex="${tabindex}", which disrupts the natural focus order.`,
                severity: 'medium',
                recommendation: 'Ensure focus order follows the visual and logical layout. Avoid positive tabindex values; use the natural DOM order or tabindex="0".',
                confidence: 'high',
                requiresReview: false
            }, 'FOCUS_ORDER'));
        }
    });

    return issues;
}

module.exports = {
    name: 'focus',
    title: 'Focus Management',
    description: 'Detects focus visibility and focus order issues (WCAG 2.4.3, 2.4.7, 2.4.11).',
    run
};
