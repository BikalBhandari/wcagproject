const BASE_URL = 'https://www.w3.org/TR/WCAG22/#';

module.exports = {
    // -------------------------------------------------------------------------
    // 1.1 Text Alternatives
    // -------------------------------------------------------------------------
    ALT_MISSING: [
        {
            criterion: '1.1.1',
            name: 'Non-text Content',
            level: 'A',
            version: '2.1',
            slug: 'non-text-content',
            impact: 'critical'
        }
    ],
    ALT_EMPTY: [
        {
            criterion: '1.1.1',
            name: 'Non-text Content',
            level: 'A',
            version: '2.1',
            slug: 'non-text-content',
            impact: 'serious'
        }
    ],
    ALT_PLACEHOLDER: [
        {
            criterion: '1.1.1',
            name: 'Non-text Content',
            level: 'A',
            version: '2.1',
            slug: 'non-text-content',
            impact: 'moderate'
        }
    ],
    ALT_REDUNDANT: [
        {
            criterion: '1.1.1',
            name: 'Non-text Content',
            level: 'A',
            version: '2.1',
            slug: 'non-text-content',
            impact: 'moderate'
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
            version: '2.1',
            slug: 'info-and-relationships',
            impact: 'serious'
        }
    ],
    LANDMARK_MISSING: [
        {
            criterion: '1.3.1',
            name: 'Info and Relationships',
            level: 'A',
            version: '2.1',
            slug: 'info-and-relationships',
            impact: 'moderate'
        },
        {
            criterion: '2.4.1',
            name: 'Bypass Blocks',
            level: 'A',
            version: '2.1',
            slug: 'bypass-blocks',
            impact: 'moderate'
        }
    ],
    FORM_LABEL_MISSING: [
        {
            criterion: '1.3.1',
            name: 'Info and Relationships',
            level: 'A',
            version: '2.1',
            slug: 'info-and-relationships'
        },
        {
            criterion: '3.3.2',
            name: 'Labels or Instructions',
            level: 'A',
            version: '2.1',
            slug: 'labels-or-instructions',
            impact: 'serious'
        },
        {
            criterion: '4.1.2',
            name: 'Name, Role, Value',
            level: 'A',
            version: '2.1',
            slug: 'name-role-value',
            impact: 'serious'
        }
    ],

    // -------------------------------------------------------------------------
    // 1.4 Distinguishable (IMPORTANT AA coverage missing before)
    // -------------------------------------------------------------------------
    COLOR_CONTRAST: [
        {
            criterion: '1.4.3',
            name: 'Contrast (Minimum)',
            level: 'AA',
            version: '2.1',
            slug: 'contrast-minimum',
            impact: 'serious'
        }
    ],
    TEXT_RESIZE: [
        {
            criterion: '1.4.4',
            name: 'Resize Text',
            level: 'AA',
            version: '2.1',
            slug: 'resize-text'
        }
    ],

    // -------------------------------------------------------------------------
    // 2.1 Keyboard
    // -------------------------------------------------------------------------
    KEYBOARD_ACCESS: [
        {
            criterion: '2.1.1',
            name: 'Keyboard',
            level: 'A',
            version: '2.1',
            slug: 'keyboard'
        }
    ],
    NO_KEYBOARD_TRAP: [
        {
            criterion: '2.1.2',
            name: 'No Keyboard Trap',
            level: 'A',
            version: '2.1',
            slug: 'no-keyboard-trap'
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
            version: '2.1',
            slug: 'focus-order'
        }
    ],
    FOCUS_VISIBLE: [
        {
            criterion: '2.4.7',
            name: 'Focus Visible',
            level: 'AA',
            version: '2.1',
            slug: 'focus-visible',
            impact: 'serious'
        }
    ],
    LINK_PURPOSE: [
        {
            criterion: '2.4.4',
            name: 'Link Purpose (In Context)',
            level: 'A',
            version: '2.1',
            slug: 'link-purpose-in-context',
            impact: 'serious'
        }
    ],
    LINK_NAME: [
        {
            criterion: '4.1.2',
            name: 'Name, Role, Value',
            level: 'A',
            version: '2.1',
            slug: 'name-role-value',
            impact: 'serious'
        }
    ],

    // -------------------------------------------------------------------------
    // 2.5 Input Modalities (WCAG 2.2 additions)
    // -------------------------------------------------------------------------
    TARGET_SIZE: [
        {
            criterion: '2.5.8',
            name: 'Target Size (Minimum)',
            level: 'AA',
            version: '2.2',
            slug: 'target-size-minimum',
            impact: 'moderate'
        }
    ],
    DRAGGING_MOVEMENTS: [
        {
            criterion: '2.5.7',
            name: 'Dragging Movements',
            level: 'AA',
            version: '2.2',
            slug: 'dragging-movements'
        }
    ],

    // -------------------------------------------------------------------------
    // 2.4 NEW (WCAG 2.2)
    // -------------------------------------------------------------------------
    FOCUS_APPEARANCE: [
        {
            criterion: '2.4.11',
            name: 'Focus Appearance',
            level: 'AA',
            version: '2.2',
            slug: 'focus-appearance',
            impact: 'serious'
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
            version: '2.1',
            slug: 'error-identification'
        }
    ],
    ERROR_SUGGESTION: [
        {
            criterion: '3.3.3',
            name: 'Error Suggestion',
            level: 'AA',
            version: '2.1',
            slug: 'error-suggestion'
        }
    ],

    // WCAG 2.2 additions
    ACCESSIBLE_AUTHENTICATION: [
        {
            criterion: '3.3.7',
            name: 'Accessible Authentication',
            level: 'A',
            version: '2.2',
            slug: 'accessible-authentication'
        }
    ],

    REDUNDANT_ENTRY: [
        {
            criterion: '3.3.8',
            name: 'Redundant Entry',
            level: 'A',
            version: '2.2',
            slug: 'redundant-entry'
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
            version: '2.1',
            slug: 'name-role-value',
            impact: 'serious'
        }
    ],
    STATUS_MESSAGES: [
        {
            criterion: '4.1.3',
            name: 'Status Messages',
            level: 'AA',
            version: '2.1',
            slug: 'status-messages',
            impact: 'moderate'
        }
    ]
};
