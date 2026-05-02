const { writePdfReport } = require('../reporting/pdfWriter');
const path = require('path');

async function testPdfStress() {
    console.log('🚀 Starting PDF Stress Test...');
    
    const mockIssues = [];
    for (let i = 1; i <= 500; i++) {
        mockIssues.push({
            agent: 'stressAgent',
            type: 'Stress Test',
            subType: i % 2 === 0 ? 'ALT_MISSING' : 'LINK_PURPOSE',
            page: `https://example.com/page-${i}`,
            element: `<img src="image-${i}.png" data-id="${i}">`,
            message: `Mock issue number ${i} for layout testing. This is a longer message to test how text wrapping behaves in the PDF table.`,
            severity: i % 3 === 0 ? 'high' : (i % 3 === 1 ? 'medium' : 'low'),
            recommendation: 'Fix the issue by adding appropriate alternative text or descriptive link purpose.',
            wcag: i % 2 === 0 ? 'ALT_MISSING' : 'LINK_PURPOSE',
            impact: 'serious'
        });
    }

    const outputFile = path.join(__dirname, '..', 'output', 'reports', 'STRESS-TEST-PDF.pdf');
    const meta = {
        compliance: 42.5,
        totalPages: 50,
        scopeName: 'STRESS_TEST_LARGE'
    };

    try {
        console.log(`📄 Generating PDF with ${mockIssues.length} issues...`);
        const start = Date.now();
        await writePdfReport(outputFile, mockIssues, meta);
        const end = Date.now();
        console.log(`✅ PDF generated successfully in ${((end - start) / 1000).toFixed(2)}s`);
        console.log(`📍 Location: ${outputFile}`);
    } catch (err) {
        console.error('❌ PDF Stress Test Failed:', err);
    }
}

testPdfStress();
