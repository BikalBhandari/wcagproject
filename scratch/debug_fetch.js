const { getPageContext } = require('../core/auditor');
const altTextAgent = require('../agents/altTextAgent');
const altQualityAgent = require('../agents/altQualityAgent');

async function test(url) {
    console.log(`\nTesting URL: ${url}`);
    
    const context = await getPageContext(url);
    
    if (context.error) {
        console.error(`Fetch Error: ${context.error}`);
        return;
    }
    
    const imgCount = context.$('img').length;
    console.log(`Image Count: ${imgCount}`);
    
    const altIssues = await altTextAgent.run(context);
    console.log(`Alt Presence Issues: ${altIssues.length}`);
    
    const qualityIssues = await altQualityAgent.run(context);
    console.log(`Alt Quality Issues: ${qualityIssues.length}`);

    console.log('All images found:');
    context.$('img').each((i, el) => {
        const alt = context.$(el).attr('alt');
        const src = context.$(el).attr('src');
        console.log(`- Img ${i}: alt="${alt}", src="${src}"`);
    });
}

async function runTests() {
    await test('https://asuonline.asu.edu/online-degree-programs/undergraduate/');
    await test('https://asuonline.asu.edu/online-degree-programs/undergraduate/accounting-degree/');
}

runTests();
