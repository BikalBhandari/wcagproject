/**
 * scratch/test_coda_ingestion.js
 * 
 * Manual test to verify Coda MCP integration.
 */
const { sendResultsToCoda } = require('../reporting/codaClient');

const mockResults = [
    {
        page: 'https://example.com',
        type: 'altTextAgent',
        subType: 'Missing Alt',
        element: '<img src="test.jpg">',
        message: 'Image is missing alt text.',
        severity: 'high',
        recommendation: 'Add descriptive alt text.',
        wcag: '1.1.1',
        impact: 'Critical',
        help: 'https://dequeuniversity.com/rules/axe/4.4/image-alt'
    },
    {
        page: 'https://example.com/about',
        type: 'altQualityAgent',
        subType: 'Redundant Alt',
        element: '<img src="logo.png" alt="logo">',
        message: 'Alt text "logo" is redundant.',
        severity: 'low',
        recommendation: 'Change alt to "Company Logo" or leave empty if decorative.',
        wcag: '1.1.1',
        impact: 'Minor',
        help: 'https://dequeuniversity.com/rules/axe/4.4/image-alt'
    }
];

async function runTest() {
    console.log('🧪 Starting Coda Ingestion Test...');
    try {
        const info = await sendResultsToCoda(mockResults, {
            scanName: 'Test Manual Scan'
        });
        console.log('🏁 Test result:', JSON.stringify(info, null, 2));
    } catch (err) {
        console.error('❌ Test failed:', err);
    }
}

runTest();
