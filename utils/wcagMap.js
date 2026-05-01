const BASE_URL = 'https://www.w3.org/TR/WCAG21/#';

module.exports = {
    // -------------------------------------------------------------------------
    // 1.1 Text Alternatives
    // -------------------------------------------------------------------------
    ALT_MISSING: [
        {
            criterion: '1.1.1',
            name: 'Non-text Content',
            level: 'A',
            slug: 'non-text-content'
        }
    ],
    ALT_EMPTY: [
        {
            criterion: '1.1.1',
            name: 'Non-text Content',
            level: 'A',
            slug: 'non-text-content'
        }
    ],
    ALT_PLACEHOLDER: [
        {
            criterion: '1.1.1',
            name: 'Non-text Content',
            level: 'A',
            slug: 'non-text-content'
        }
    ],
    ALT_REDUNDANT: [
        {
            criterion: '1.1.1',
            name: 'Non-text Content',
            level: 'A',
            slug: 'non-text-content'
        }
    ],

    // -------------------------------------------------------------------------
    // 1.3 Adaptable
    // -------------------------------------------------------------------------
    HEADING_STRUCTURE: [
        {
            criterion: '1.3.1',
            name: 'Info and Relationships',
            level: 'A',
            slug: 'info-and-relationships'
        }
    ],
    LANDMARK_MISSING: [
        {
            criterion: '1.3.1',
            name: 'Info and Relationships',
            level: 'A',
            slug: 'info-and-relationships'
        },
        {
            criterion: '2.4.1',
            name: 'Bypass Blocks',
            level: 'A',
            slug: 'bypass-blocks'
        }
    ],
    FORM_LABEL_MISSING: [
        {
            criterion: '1.3.1',
            name: 'Info and Relationships',
            level: 'A',
            slug: 'info-and-relationships'
        },
        {
            criterion: '3.3.2',
            name: 'Labels or Instructions',
            level: 'A',
            slug: 'labels-or-instructions'
        },
        {
            criterion: '4.1.2',
            name: 'Name, Role, Value',
            level: 'A',
            slug: 'name-role-value'
        }
    ],
    FORM_GROUP_MISSING: [
        {
            criterion: '1.3.1',
            name: 'Info and Relationships',
            level: 'A',
            slug: 'info-and-relationships'
        }
    ],

    // -------------------------------------------------------------------------
    // 2.4 Navigable
    // -------------------------------------------------------------------------
    FOCUS_ORDER: [
        {
            criterion: '2.4.3',
            name: 'Focus Order',
            level: 'A',
            slug: 'focus-order'
        }
    ],
    LINK_PURPOSE: [
        {
            criterion: '2.4.4',
            name: 'Link Purpose (In Context)',
            level: 'A',
            slug: 'link-purpose-in-context'
        }
    ],
    HEADINGS_AND_LABELS: [
        {
            criterion: '2.4.6',
            name: 'Headings and Labels',
            level: 'AA',
            slug: 'headings-and-labels'
        }
    ],

    // -------------------------------------------------------------------------
    // 3.3 Input Assistance
    // -------------------------------------------------------------------------
    ERROR_IDENTIFICATION: [
        {
            criterion: '3.3.1',
            name: 'Error Identification',
            level: 'A',
            slug: 'error-identification'
        }
    ],
    LABELS_OR_INSTRUCTIONS: [
        {
            criterion: '3.3.2',
            name: 'Labels or Instructions',
            level: 'A',
            slug: 'labels-or-instructions'
        }
    ],
    ERROR_SUGGESTION: [
        {
            criterion: '3.3.3',
            name: 'Error Suggestion',
            level: 'AA',
            slug: 'error-suggestion'
        }
    ],

    // -------------------------------------------------------------------------
    // 4.1 Compatible
    // -------------------------------------------------------------------------
    ACCESSIBLE_NAME: [
        {
            criterion: '4.1.2',
            name: 'Name, Role, Value',
            level: 'A',
            slug: 'name-role-value'
        }
    ],
    STATUS_MESSAGES: [
        {
            criterion: '4.1.3',
            name: 'Status Messages',
            level: 'AA',
            slug: 'status-messages'
        }
    ]
};
