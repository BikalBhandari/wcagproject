const { processIssues, getElementSignature } = require('../utils/postProcessor');

const mockIssues = [
    {
        element: '<img src="https://example.com/image1.jpg">',
        subType: 'Missing Alt Attribute',
        severity: 'high',
        type: 'presence'
    },
    {
        element: '<img src="https://example.com/image1.jpg">',
        subType: 'GENERIC',
        severity: 'medium',
        type: 'quality'
    },
    {
        element: '<img data-src="https://example.com/lazy1.jpg">',
        subType: 'Empty Alt Attribute',
        severity: 'high',
        type: 'presence'
    }
];

console.log('--- Testing getElementSignature ---');
console.log('Standard src:', getElementSignature('<img src="test.jpg">'));
console.log('Data src:', getElementSignature('<img data-src="lazy.jpg">'));
console.log('Data lazy src:', getElementSignature('<img data-lazy-src="lazy-src.jpg">'));
console.log('Data original:', getElementSignature('<img data-original="orig.jpg">'));

console.log('\n--- Testing processIssues (QA Mode) ---');
const qaResults = processIssues(mockIssues, 'qa');
console.log('QA Results Count:', qaResults.length);
console.log('QA Issues:', JSON.stringify(qaResults, null, 2));

console.log('\n--- Testing processIssues (Clean Mode) ---');
const cleanResults = processIssues(mockIssues, 'clean');
console.log('Clean Results Count:', cleanResults.length);
console.log('Clean Issues:', JSON.stringify(cleanResults, null, 2));

// Assertions
if (qaResults.length === 3) {
    console.log('\n✅ QA Mode test passed (3 issues preserved)');
} else {
    console.log('\n❌ QA Mode test failed (Expected 3, got ' + qaResults.length + ')');
}

if (cleanResults.length === 2) {
    console.log('✅ Clean Mode test passed (2 unique elements merged)');
} else {
    console.log('❌ Clean Mode test failed (Expected 2, got ' + cleanResults.length + ')');
}
