const { attachWcag } = require('../utils/issueUtils');

// Hardcoded set of valid ARIA roles per WAI-ARIA specs
const VALID_ROLES = new Set([
    'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'checkbox', 
    'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog', 
    'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 
    'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 
    'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 
    'navigation', 'none', 'note', 'option', 'presentation', 'progressbar', 'radio', 
    'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 
    'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab', 
    'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 
    'tree', 'treegrid', 'treeitem'
]);

// Map of roles to their strictly required attributes
const REQUIRED_ATTRS = {
    'checkbox': ['aria-checked'],
    'radio': ['aria-checked'],
    'scrollbar': ['aria-valuenow'],
    'slider': ['aria-valuenow'],
    'spinbutton': ['aria-valuenow'],
    'combobox': ['aria-expanded'],
    'tab': ['aria-selected']
};

// Map of HTML elements to their native roles to detect redundancy
const REDUNDANT_ROLES = {
    'button': ['button'],
    'a': ['link'],
    'nav': ['navigation'],
    'main': ['main'],
    'header': ['banner'],
    'footer': ['contentinfo'],
    'article': ['article'],
    'aside': ['complementary'],
    'h1': ['heading'],
    'h2': ['heading'],
    'h3': ['heading'],
    'h4': ['heading'],
    'h5': ['heading'],
    'h6': ['heading'],
    'li': ['listitem'],
    'ul': ['list'],
    'ol': ['list'],
    'table': ['table']
};

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];

    // 1. Detect invalid roles & 2. Detect redundant roles
    $('[role]').each((i, el) => {
        const role = $(el).attr('role').trim().toLowerCase();
        const tagName = el.tagName.toLowerCase();

        // Check for multiple roles (only the first one is used, but we check if all are valid)
        const roles = role.split(/\s+/);
        
        roles.forEach(r => {
            if (!VALID_ROLES.has(r)) {
                issues.push(attachWcag({
                    type: 'Validation',
                    subType: 'ARIA Misuse',
                    page: url,
                    element: $.html(el).substring(0, 150),
                    message: `Invalid ARIA role "${r}" detected.`,
                    severity: 'medium',
                    recommendation: 'Ensure ARIA roles follow WAI-ARIA specifications and are spelled correctly.',
                    confidence: 'high',
                    requiresReview: false
                }, 'ACCESSIBLE_NAME'));
            }
        });

        // Redundancy check
        const primaryRole = roles[0];
        if (REDUNDANT_ROLES[tagName] && REDUNDANT_ROLES[tagName].includes(primaryRole)) {
            issues.push(attachWcag({
                type: 'Validation',
                subType: 'ARIA Misuse',
                page: url,
                element: $.html(el).substring(0, 150),
                message: `Redundant ARIA role "${primaryRole}" on semantic <${tagName}> element.`,
                severity: 'low',
                recommendation: 'Remove redundant ARIA roles from elements that already have the same native semantic meaning.',
                confidence: 'high',
                requiresReview: false
            }, 'ACCESSIBLE_NAME'));
        }

        // 3. Detect missing required attributes
        if (REQUIRED_ATTRS[primaryRole]) {
            const missing = REQUIRED_ATTRS[primaryRole].filter(attr => $(el).attr(attr) === undefined);
            if (missing.length > 0) {
                issues.push(attachWcag({
                    type: 'Validation',
                    subType: 'ARIA Misuse',
                    page: url,
                    element: $.html(el).substring(0, 150),
                    message: `Role "${primaryRole}" is missing required attributes: ${missing.join(', ')}.`,
                    severity: 'high',
                    recommendation: `Ensure role "${primaryRole}" includes all required ARIA states and properties.`,
                    confidence: 'medium',
                    requiresReview: true
                }, 'ACCESSIBLE_NAME'));
            }
        }
    });

    // 4. Detect aria-hidden misuse on focusable elements
    $('[aria-hidden="true"]').each((i, el) => {
        // Broad selector for focusable elements
        const isFocusable = $(el).is('a[href], button, input, select, textarea, [tabindex]');
        
        if (isFocusable) {
            issues.push(attachWcag({
                type: 'Validation',
                subType: 'ARIA Misuse',
                page: url,
                element: $.html(el).substring(0, 150),
                message: 'Interactive element is hidden from screen readers (aria-hidden="true") but remains focusable.',
                severity: 'high',
                recommendation: 'Avoid aria-hidden="true" on focusable elements. If the element should be hidden, also remove it from the tab order using tabindex="-1".',
                confidence: 'medium',
                requiresReview: true
            }, 'ACCESSIBLE_NAME'));
        }
    });

    return issues;
}

module.exports = {
    name: 'aria',
    title: 'ARIA Validation',
    description: 'Checks ARIA roles for validity, redundant native-role overrides, missing required states or properties, and aria-hidden misuse on focusable elements.',
    run
};
