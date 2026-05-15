const { attachWcag } = require('../utils/issueUtils');

function parseBooleanSetting(value, defaultValue = true) {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    return !['no', 'false', '0', 'off'].includes(String(value).trim().toLowerCase());
}

function parseIntegerSetting(value, defaultValue = 500) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

async function run(context, config = {}) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];
    const checkTraps = parseBooleanSetting(config.checkTraps, true);
    const eventTimeout = parseIntegerSetting(config.eventTimeout, 500);
    const trapChildThreshold = Math.max(5, Math.round(eventTimeout / 100));

    // 1. Detect non-keyboard-accessible interactive elements
    // Elements with onclick but NOT button, a[href], or tabindex
    $('[onclick]').each((i, el) => {
        const tagName = el.tagName.toLowerCase();
        const hasHref = $(el).attr('href');
        const hasTabindex = $(el).attr('tabindex');

        if (tagName !== 'button' && (tagName !== 'a' || !hasHref) && hasTabindex === undefined) {
            issues.push(attachWcag({
                type: 'Interaction',
                subType: 'Keyboard Access',
                page: url,
                element: $.html(el).substring(0, 150),
                message: 'Interactive element (has onclick) is not accessible via keyboard.',
                severity: 'high',
                recommendation: 'Ensure element is focusable and operable via keyboard (use <button> or add tabindex="0" and keyboard event listeners).',
                confidence: 'medium',
                requiresReview: true
            }, 'KEYBOARD_ACCESS'));
        }
    });

    // 2. Detect tabindex misuse
    $('[tabindex]').each((i, el) => {
        const tabindex = parseInt($(el).attr('tabindex'), 10);
        
        if (tabindex > 0) {
            issues.push(attachWcag({
                type: 'Interaction',
                subType: 'Tabindex Misuse',
                page: url,
                element: $.html(el).substring(0, 150),
                message: `Element has tabindex="${tabindex}". Positive tabindex values disrupt the natural tab order.`,
                severity: 'medium',
                recommendation: 'Use tabindex="0" to make elements focusable in their natural DOM order, or tabindex="-1" to remove from tab order.',
                confidence: 'high',
                requiresReview: false
            }, 'KEYBOARD_ACCESS'));
        }
    });

    // 3. Detect potential keyboard traps (heuristics)
    if (checkTraps) {
        // - Containers with overflow: hidden that might hide focus rings
        $('[style*="overflow: hidden"], [style*="overflow:hidden"]').each((i, el) => {
            // Only care if it contains interactive elements
            if ($(el).find('a, button, input, [tabindex]').length > 0) {
                issues.push(attachWcag({
                    type: 'Interaction',
                    subType: 'Potential Keyboard Trap',
                    page: url,
                    element: $.html(el).substring(0, 150),
                    message: 'Container with "overflow: hidden" contains focusable elements, which may hide focus indicators.',
                    severity: 'medium',
                    recommendation: 'Ensure focus indicators are fully visible. Avoid "overflow: hidden" on containers with interactive content.',
                    confidence: 'low',
                    requiresReview: true
                }, 'NO_KEYBOARD_TRAP'));
            }
        });

        // - Fixed containers with no exit controls
        $('[style*="position: fixed"], [style*="position:fixed"]').each((i, el) => {
            // Simple heuristic: if it's large/modal-like but has no close button
            const text = $(el).text().toLowerCase();
            const hasCloseButton = text.includes('close') || text.includes('×') || $(el).find('button, a').length > 0;
            
            if (!hasCloseButton && $(el).children().length >= trapChildThreshold) {
                issues.push(attachWcag({
                    type: 'Interaction',
                    subType: 'Potential Keyboard Trap',
                    page: url,
                    element: $.html(el).substring(0, 150),
                    message: 'Fixed position container with no obvious exit controls may trap keyboard users.',
                    severity: 'high',
                    recommendation: 'Ensure fixed overlays or modals can be dismissed via the Escape key and have a visible, focusable close button.',
                    confidence: 'low',
                    requiresReview: true
                }, 'NO_KEYBOARD_TRAP'));
            }
        });
    }

    return issues;
}

module.exports = {
    name: 'keyboard',
    title: 'Keyboard Accessibility',
    description: 'Flags onclick-only elements lacking keyboard access, positive tabindex values, and heuristic keyboard-trap patterns.',
    run
};
