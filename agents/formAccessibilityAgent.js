const { attachWcag } = require('../utils/issueUtils');

/**
 * Form Accessibility Agent (Production Ready)
 * Covers:
 * - Missing / empty labels
 * - Accessible names
 * - Required field indication
 * - Button accessible names
 * - Fieldset / legend grouping
 */

function getLabelText($, el) {
    const $el = $(el);
    const id = $el.attr('id');

    // label[for]
    if (id) {
        const label = $(`label[for="${id}"]`).text().trim();
        if (label) return label;
    }

    // wrapped label
    const wrapped = $el.closest('label').text().trim();
    if (wrapped) return wrapped;

    // aria-label
    const ariaLabel = $el.attr('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // aria-labelledby
    const labelledBy = $el.attr('aria-labelledby');
    if (labelledBy) {
        return labelledBy
            .split(' ')
            .map(id => $(`#${id}`).text().trim())
            .join(' ')
            .trim();
    }

    // fallback
    const title = $el.attr('title');
    if (title && title.trim()) return title.trim();

    return '';
}

function hasAccessibleName($, el) {
    return getLabelText($, el).length > 0;
}

function generateRecommendation(type, tag) {
    switch (type) {
        case 'missing-label':
            return 'Associate this form control with a <label>, or use aria-label / aria-labelledby.';

        case 'empty-label':
            return `Provide meaningful label text for this ${tag}. Screen readers require descriptive labels.`;

        case 'required-indicator':
            return 'Ensure required fields are visually indicated (e.g., "*", "Required") and programmatically set using required or aria-required="true".';

        case 'button-name':
            return 'Provide visible text or an accessible name (aria-label / aria-labelledby) for this button.';

        case 'missing-legend':
            return 'Group related inputs using <fieldset> and provide a <legend> describing the group.';

        default:
            return 'Ensure form controls meet WCAG accessibility requirements.';
    }
}

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];

    // ------------------------
    // 1. Form Controls
    // ------------------------
    const controls = $('input:not([type="hidden"]), textarea, select');

    controls.each((i, el) => {
        const $el = $(el);
        const tag = el.tagName.toLowerCase();
        const type = $el.attr('type') || tag;

        const labelText = getLabelText($, el);
        const hasLabel = labelText.length > 0;

        // Missing label
        if (!hasLabel) {
            issues.push(attachWcag({
                type: 'Validation',
                subType: 'Missing Label',
                page: url,
                element: $.html(el),
                message: `Form control (${type}) does not have an accessible label.`,
                severity: 'high',
                recommendation: generateRecommendation('missing-label', type),
                confidence: 'high',
                requiresReview: false
            }, 'FORM_LABEL_MISSING'));
        }

        // Empty label (edge case)
        if (hasLabel && labelText.trim() === '') {
            issues.push(attachWcag({
                type: 'Validation',
                subType: 'Empty Label',
                page: url,
                element: $.html(el),
                message: `Form control (${type}) has an empty label.`,
                severity: 'high',
                recommendation: generateRecommendation('empty-label', type),
                confidence: 'high',
                requiresReview: false
            }, 'FORM_LABEL_MISSING'));
        }

        // Required indication
        const isRequired =
            $el.prop('required') ||
            $el.attr('aria-required') === 'true';

        if (isRequired) {
            const labelLower = labelText.toLowerCase();

            const hasIndicator =
                labelLower.includes('*') ||
                labelLower.includes('required');

            if (!hasIndicator && !labelLower.includes('optional')) {
                issues.push(attachWcag({
                type: 'Validation',
                subType: 'Required Indicator',
                page: url,
                element: $.html(el),
                message: `Required field (${type}) may not be clearly indicated to users.`,
                severity: 'medium',
                    recommendation: generateRecommendation('required-indicator'),
                    confidence: 'medium',
                    requiresReview: true
                }, 'LABELS_OR_INSTRUCTIONS'));
            }
        }
    });

    // ------------------------
    // 2. Buttons
    // ------------------------
    $('button, input[type="submit"], input[type="button"], input[type="reset"]').each((i, el) => {
        const $el = $(el);

        const text = $el.text().trim();
        const value = $el.attr('value') || '';
        const ariaLabel = $el.attr('aria-label') || '';
        const labelledBy = $el.attr('aria-labelledby');

        let labelledByText = '';
        if (labelledBy) {
            labelledByText = labelledBy
                .split(' ')
                .map(id => $(`#${id}`).text().trim())
                .join(' ');
        }

        if (!text && !value && !ariaLabel && !labelledByText) {
            issues.push(attachWcag({
                type: 'Validation',
                subType: 'Button Name',
                page: url,
                element: $.html(el),
                message: 'Button does not have an accessible name.',
                severity: 'high',
                recommendation: generateRecommendation('button-name'),
                confidence: 'high',
                requiresReview: false
            }, 'ACCESSIBLE_NAME'));
        }
    });

    // ------------------------
    // 3. Fieldset / Legend
    // ------------------------
    const groups = {};

    $('input[type="radio"], input[type="checkbox"]').each((i, el) => {
        const name = $(el).attr('name');
        if (!name) return;

        if (!groups[name]) groups[name] = [];
        groups[name].push(el);
    });

    Object.keys(groups).forEach(name => {
        const inputs = groups[name];

        if (inputs.length > 1) {
            const first = $(inputs[0]);
            const fieldset = first.closest('fieldset');

            if (fieldset.length === 0 || fieldset.find('legend').length === 0) {
                issues.push(attachWcag({
                    type: 'Validation',
                    subType: 'Missing Legend',
                    page: url,
                    element: `Group: ${name}`,
                    message: `Group of ${first.attr('type')} inputs is missing a fieldset or legend.`,
                    severity: 'medium',
                    recommendation: generateRecommendation('missing-legend'),
                    confidence: 'medium',
                    requiresReview: true
                }, 'FORM_GROUP_MISSING'));
            }
        }
    });

    return issues;
}

module.exports = {
    name: 'formAccessibility',
    title: 'Form Accessibility',
    description: 'Validates accessible labels, required field indicators, button names, and grouped inputs per WCAG.',
    run
};