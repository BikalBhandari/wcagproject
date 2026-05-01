const { runScan } = require('../runScan');

async function test() {
    const scope = 'validator'; // validator has 6 URLs
    console.log(`Testing scope: ${scope}`);
    
    const { issues, stats } = await runScan(scope, ['altTextAgent'], 10);
    
    console.log('\n--- Scan Complete ---');
    console.log(`Total Pages Processed (stats): ${stats.totalPages}`);
    console.log(`Total Issues Found: ${issues.length}`);
    console.log(`Stats Object: ${JSON.stringify(stats, null, 2)}`);
}

test();
