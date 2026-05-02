'use strict';

const { formatWcag, sanitizeElement } = require('../utils/formatUtils');

const mockIssues = [
    {
        page: 'https://example.com',
        type: 'Analysis',
        subType: 'GENERIC',
        element: '<img src="data:image/svg+xml,%3csvg%20aria-hidden=\'true\'%20focusable=\'false\'%20role=\'presentation\'%20xmlns=\'http://www.w3.org/2000/svg\'%20viewBox=\'0%200%20512%20512\'%3e%3cpath%20fill=\'currentColor\'%20d=\'M0%20464c0%2026.5%2021.5%2048%2048%2048h352c26.5%200%2048-21.5%2048-48V192H0v272zm320-196c0-6.6%205.4-12%2012-12h40c6.6%200%2012%205.4%2012%2012v40c0%206.6-5.4%2012-12%2012h-40c-6.6%200-12-5.4-12-12v-40zm0%20128c0-6.6%205.4-12%2012-12h40c6.6%200%2012%205.4%2012%2012v40c0%206.6-5.4%2012-12%2012h-4" alt="generic">',
        message: 'Alt text quality issue: generic',
        wcag: [
            { criterion: '1.1.1', name: 'Non-text Content', level: 'A' }
        ]
    },
    {
        page: 'https://example.com',
        type: 'Analysis',
        subType: 'LANDMARK_MISSING',
        element: '<body>',
        message: 'Main landmark missing',
        wcag: [
            { criterion: '1.3.1', name: 'Info and Relationships', level: 'A' },
            { criterion: '2.4.1', name: 'Bypass Blocks', level: 'A' }
        ]
    }
];

console.log('--- Testing Sanitization ---');
mockIssues.forEach((issue, i) => {
    const sanitized = sanitizeElement(issue.element);
    console.log(`Issue ${i+1} Original length: ${issue.element.length}`);
    console.log(`Issue ${i+1} Sanitized: ${sanitized}`);
});

console.log('\n--- Testing WCAG Formatting ---');
mockIssues.forEach((issue, i) => {
    const formatted = formatWcag(issue.wcag);
    console.log(`Issue ${i+1} Formatted WCAG: ${formatted}`);
});
