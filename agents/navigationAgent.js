const { attachWcag } = require('../utils/issueUtils');

/**
 * Navigation Agent
 * 
 * Audits the sequential navigation flow of the page:
 * 1. Identifies all navigable elements.
 * 2. Determines their semantic role.
 * 3. Calculates their accessible name.
 * 4. Lists them in their tab/DOM order.
 */

function getAccessibleName($, el) {
    const $el = $(el);
    
    // 1. ARIA Label
    const ariaLabel = $el.attr('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // 2. ARIA Labelledby (simplified: just check if the ID exists)
    const ariaLabelledBy = $el.attr('aria-labelledby');
    if (ariaLabelledBy) {
        const labelText = $(`#${ariaLabelledBy}`).text().trim();
        if (labelText) return labelText;
    }

    // 3. Associated Label (for form controls)
    const id = $el.attr('id');
    if (id) {
        const labelText = $(`label[for="${id}"]`).text().trim();
        if (labelText) return labelText;
    }
    
    // Check if wrapped in a label
    const parentLabel = $el.closest('label').text().trim();
    if (parentLabel) return parentLabel;

    // 4. Placeholder (for inputs)
    const placeholder = $el.attr('placeholder');
    if (placeholder && placeholder.trim()) return placeholder.trim();

    // 5. Title attribute
    const title = $el.attr('title');
    if (title && title.trim()) return title.trim();

    // 6. Text Content (for buttons, links)
    const textContent = $el.text().trim();
    if (textContent) return textContent;

    // 7. Value (for input type="button/submit")
    const value = $el.attr('value');
    if (value && value.trim()) return value.trim();

    // 8. Alt text (if it's an image within a link/button)
    const imgAlt = $el.find('img').attr('alt');
    if (imgAlt && imgAlt.trim()) return imgAlt.trim();

    return 'No accessible name found';
}

function getSemanticRole($, el) {
    const $el = $(el);
    const explicitRole = $el.attr('role');
    if (explicitRole) return explicitRole;

    const tag = el.tagName.toLowerCase();
    switch (tag) {
        case 'a': return 'link';
        case 'button': return 'button';
        case 'input': {
            const type = $el.attr('type') || 'text';
            if (['button', 'submit', 'reset'].includes(type)) return 'button';
            if (['checkbox', 'radio'].includes(type)) return type;
            return 'textbox';
        }
        case 'select': return 'combobox';
        case 'textarea': return 'textbox';
        default: return 'element';
    }
}

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];

    // Select all potentially navigable elements
    const navigableSelectors = [
        'a[href]',
        'button',
        'input:not([type="hidden"])',
        'select',
        'textarea',
        '[tabindex="0"]',
        '[tabindex]:not([tabindex^="-"])'
    ].join(',');

    let orderCount = 0;

    $(navigableSelectors).each((i, el) => {
        const $el = $(el);

        // Filter out elements that are effectively hidden from screen readers
        if ($el.attr('aria-hidden') === 'true') return;
        if ($el.closest('[aria-hidden="true"]').length) return;
        
        // Basic visibility check (Cheerio can't check CSS display/visibility, 
        // but we can check common patterns)
        const style = $el.attr('style') || '';
        if (style.includes('display: none') || style.includes('visibility: hidden')) return;

        orderCount++;
        const role = getSemanticRole($, el);
        const name = getAccessibleName($, el);

        // We report this as an "Info" type or "Detection" to list the navigation flow
        issues.push(attachWcag({
            type: 'Navigation',
            subType: 'Flow Map',
            page: url,
            element: `<${el.tagName.toLowerCase()} ...>`,
            message: `Order: ${orderCount} | Role: ${role} | Name: "${name}"`,
            severity: name === 'No accessible name found' ? 'high' : 'low',
            recommendation: name === 'No accessible name found' 
                ? 'Provide a descriptive accessible name using aria-label, a <label> element, or visible text content.'
                : 'Review for logical navigation order.',
            confidence: 'high',
            meta: {
                order: orderCount,
                role: role,
                accessibleName: name
            }
        }, name === 'No accessible name found' ? 'ACCESSIBLE_NAME' : 'FOCUS_ORDER'));
    });

    return issues;
}

module.exports = {
    name: 'navigation',
    title: 'Focusable Element Flow Map',
    subtitle: 'Heuristic Mapping Agent',
    skills: ['Tab Order Mapping', 'ARIA Name Reporting'],
    description: 'Lists focusable elements in DOM order with their semantic role and accessible name. This is a flow inventory, not a computed browser tab-order or interaction-state audit.',
    run
};
