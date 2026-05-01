const { attachWcag } = require('../utils/issueUtils');

/**
 * Form Error Accessibility Agent
 * Detects issues with error handling and messaging:
 * - Inputs marked invalid without error message
 * - Error messages not associated with inputs
 * - Missing aria-invalid usage
 * - Missing error summaries (basic heuristic)
 */

function getDescribedByText($, el) {
    const ids = $(el).attr('aria-describedby');
    if (!ids) return '';

    return ids
        .split(' ')
        .map(id => $(`#${id}`).text().trim())
        .join(' ')
        .trim();
}

function findNearbyError($, el) {
    const parent = $(el).closest('div, fieldset, form');

    // Look for common error patterns
    const errorSelectors = [
        '.error',
        '.error-message',
        '.field-error',
        '[role="alert"]',
        '[aria-live]'
    ];

    for (const selector of errorSelectors) {
        const found = parent.find(selector).first();
        if (found.length && found.text().trim()) {
            return found.text().trim();
        }
    }

    return '';
}

function generateRecommendation(type) {
    switch (type) {
        case 'missing-error-message':
            return 'Provide a clear error message describing what went wrong and how to fix it.';

        case 'missing-association':
            return 'Associate the error message with the input using aria-describedby.';

        case 'missing-aria-invalid':
            return 'Set aria-invalid="true" on inputs that fail validation.';

        case 'missing-error-summary':
            return 'Provide an error summary at the top of the form to help users quickly identify issues.';

        default:
            return 'Ensure form errors are accessible and properly communicated to users.';
    }
}

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];

    // ------------------------
    // 1. Inputs with aria-invalid
    // ------------------------
    $('[aria-invalid="true"]').each((i, el) => {
        const $el = $(el);

        const described = getDescribedByText($, el);
        const nearby = findNearbyError($, el);

        if (!described && !nearby) {
            issues.push(attachWcag({
                type: 'Validation',
                subType: 'Missing Error Message',
                page: url,
                element: $.html(el).substring(0, 100),
                message: 'Input is marked invalid but no error message is present.',
                severity: 'high',
                recommendation: generateRecommendation('missing-error-message'),
                confidence: 'high',
                requiresReview: false
            }, 'ERROR_IDENTIFICATION'));
        }

        if (nearby && !described) {
            issues.push(attachWcag({
                type: 'Validation',
                subType: 'Missing Error Association',
                page: url,
                element: $.html(el).substring(0, 100),
                message: 'Error message is present but not associated with the input.',
                severity: 'high',
                recommendation: generateRecommendation('missing-association'),
                confidence: 'high',
                requiresReview: false
            }, 'ACCESSIBLE_NAME'));
        }
    });

    // ------------------------
    // 2. Inputs with visual error but no aria-invalid
    // ------------------------
    $('input, textarea, select').each((i, el) => {
        const $el = $(el);

        const hasAriaInvalid = $el.attr('aria-invalid') === 'true';
        const nearbyError = findNearbyError($, el);

        if (nearbyError && !hasAriaInvalid) {
            issues.push(attachWcag({
                type: 'Validation',
                subType: 'Missing Aria-Invalid',
                page: url,
                element: $.html(el).substring(0, 100),
                message: 'Input appears to have an error message but is not marked with aria-invalid.',
                severity: 'medium',
                recommendation: generateRecommendation('missing-aria-invalid'),
                confidence: 'medium',
                requiresReview: true
            }, 'ERROR_IDENTIFICATION'));
        }
    });

    // ------------------------
    // 3. Form-level error summary (basic heuristic)
    // ------------------------
    $('form').each((i, form) => {
        const $form = $(form);

        const hasFieldErrors =
            $form.find('.error, .error-message, [role="alert"]').length > 0;

        const hasSummary =
            $form.find('.error-summary, .form-errors, [role="alert"][aria-live]').length > 0;

        if (hasFieldErrors && !hasSummary) {
            issues.push(attachWcag({
                type: 'Validation',
                subType: 'Missing Error Summary',
                page: url,
                element: '<form>',
                message: 'Form has field-level errors but no error summary.',
                severity: 'low',
                recommendation: generateRecommendation('missing-error-summary'),
                confidence: 'low',
                requiresReview: true
            }, 'ERROR_IDENTIFICATION'));
        }
    });

    return issues;
}

module.exports = {
    name: 'formError',
    title: 'Form Error Accessibility',
    description: 'Ensures form validation errors are properly communicated, associated, and accessible to assistive technologies.',
    run
};

