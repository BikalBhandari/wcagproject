require('dotenv').config();
const { sendResultsToCoda } = require('../reporting/codaClient');

async function testCodaBatching() {
    console.log('🚀 Testing Coda Batching with 250 Mock Issues...');
    
    const mockIssues = [];
    for (let i = 1; i <= 250; i++) {
        mockIssues.push({
            page: `https://example.com/page-${i}`,
            type: 'Detection',
            subType: 'Missing Alt Attribute',
            element: `<img src="test-${i}.jpg">`,
            message: `Mock issue #${i} for stress testing batching.`,
            severity: 'high',
            recommendation: 'Add alt text.',
            wcag: [{ criterion: '1.1.1', level: 'A' }],
            impact: 'critical',
            helpUrl: 'https://www.w3.org/TR/WCAG21/#non-text-content'
        });
    }

    try {
        const result = await sendResultsToCoda(mockIssues, {
            scanName: 'Stress Test (Batching)',
            folderName: 'Accessibility Audits'
        });
        console.log('✅ Batching test successful!');
        console.log('🔗 View in Coda:', result.url);
    } catch (err) {
        console.error('❌ Batching test failed:', err.message);
        process.exit(1);
    }
}

testCodaBatching();
