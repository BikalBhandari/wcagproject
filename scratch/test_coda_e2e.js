/**
 * End-to-end test of the Coda MCP integration.
 * Sends 3 synthetic audit issues to Coda and verifies the flow.
 * Run: node scratch/test_coda_e2e.js
 */
require('dotenv').config();

const { sendResultsToCoda } = require('../reporting/codaClient');

const MOCK_RESULTS = [
    {
        type: 'altText',
        subType: 'missing',
        page: 'https://example.asu.edu/page-one',
        element: '<img src="banner.jpg">',
        message: 'Image is missing alt text',
        severity: 'high',
        recommendation: 'Add a descriptive alt attribute',
        wcag: '1.1.1',
        impact: 'critical',
        help: 'https://dequeuniversity.com/rules/axe/4.x/image-alt'
    },
    {
        type: 'link',
        subType: 'emptyAnchor',
        page: 'https://example.asu.edu/page-two',
        element: '<a href="/about"></a>',
        message: 'Link has no discernible text',
        severity: 'high',
        recommendation: 'Add link text or aria-label',
        wcag: '2.4.4',
        impact: 'serious',
        help: 'https://dequeuniversity.com/rules/axe/4.x/link-name'
    },
    {
        type: 'heading',
        subType: 'skippedLevel',
        page: 'https://example.asu.edu/page-three',
        element: '<h4>Section</h4>',
        message: 'Heading jumps from H2 to H4',
        severity: 'medium',
        recommendation: 'Use sequential heading levels',
        wcag: '1.3.1',
        impact: 'moderate',
        help: 'https://dequeuniversity.com/rules/axe/4.x/heading-order'
    }
];

(async () => {
    console.log('🧪 Starting Coda MCP end-to-end test...\n');
    console.log(`   Token: ${process.env.CODA_API_TOKEN?.slice(0, 8)}...`);
    console.log(`   Results: ${MOCK_RESULTS.length} mock issues\n`);

    try {
        await sendResultsToCoda(MOCK_RESULTS, {
            scanName: 'TEST_SCAN',
            folderName: 'Accessibility Audits'
        });
        console.log('\n✅ Test PASSED — check your Coda doc!');
    } catch (err) {
        console.error('\n❌ Test FAILED:', err.message);
        process.exit(1);
    }
})();
