const { runScan } = require('../runScan');
const { writeReport } = require('./reporting/csvWriter');
const { sendResultsToCoda } = require('./reporting/codaClient');
const urlUtils = require('./utils/urlUtils');
const { validateIssue } = require('./utils/issueSchema');
const { processIssues } = require('./utils/postProcessor');
const { writePdfReport } = require('./reporting/pdfWriter');

async function runAuditWithLimit(input, agents, concurrency, limit) {
    const { issues: rawIssues, stats: rawStats } = await runScan(input, agents, concurrency);
    const issues = processIssues(rawIssues).slice(0, limit); // Mocking a very large result set
    // ... wait, I'll just use the real audit but on a site with many images.
}

async function stressTest() {
    console.log('🚀 Starting Stress Test for Audit Result Limits...');
    
    // Create a temporary scope with a site that has many images
    const testScope = 'data/scopes/asuo_newsroom.json'; // This scope has ~600 URLs
    
    console.log(`🌐 Scanning scope: ${testScope}`);
    
    // Run audit with multiple agents to maximize issue count
    const result = await runAudit(testScope, ['altTextAgent', 'altQualityAgent', 'linkTextAgent'], 20);
    
    if (result.error) {
        console.error('❌ Stress test failed:', result.error);
        process.exit(1);
    }
    
    console.log(`✅ Audit complete. Total issues reported: ${result.totalIssues}`);
    
    // Verify CSV line count
    const csvPath = path.join(__dirname, '../output/reports', result.reportFile);
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const issueCountInCsv = lines.length - 1;
    
    console.log(`📊 Issues in CSV: ${issueCountInCsv}`);
    
    if (issueCountInCsv === result.totalIssues) {
        console.log('✨ SUCCESS: CSV issue count matches audit result.');
    } else {
        console.error(`⚠️  MISMATCH: Result said ${result.totalIssues} but CSV has ${issueCountInCsv}`);
    }
    
    if (issueCountInCsv > 100) {
        console.log(`🚀 CONFIRMED: The pipeline successfully handles ${issueCountInCsv} records (well over 100).`);
    } else {
        console.warn('⚠️  The test didn\'t find enough issues to verify the 100+ limit. Try a larger scope.');
    }
}

stressTest().catch(err => {
    console.error('Fatal error during stress test:', err);
});
