/**
 * Get document guide and search existing docs to understand URI format.
 * Run: node scratch/coda_doc_guide.js
 */
require('dotenv').config();

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

async function run() {
    const transport = new StreamableHTTPClientTransport(
        new URL('https://coda.io/apis/mcp'),
        { requestInit: { headers: { 'Authorization': `Bearer ${process.env.CODA_API_TOKEN}` } } }
    );
    const client = new Client({ name: 'doc-guide-probe', version: '1.0.0' }, { capabilities: { tools: {} } });

    try {
        await client.connect(transport);
        console.log('✅ Connected\n');

        // 1. Get document guide
        const guide = await client.callTool({ name: 'tool_guide', arguments: { topic: 'document' } });
        const guideText = guide?.content?.find(c => c.type === 'text')?.text || '';
        console.log('===== DOCUMENT GUIDE =====');
        console.log(guideText.slice(0, 3000));

        // 2. Search for existing docs
        console.log('\n===== SEARCH: Accessibility =====');
        const searchResult = await client.callTool({ name: 'search', arguments: { query: 'Accessibility', types: ['document'], limit: 5 } });
        const searchText = searchResult?.content?.find(c => c.type === 'text')?.text || '';
        console.log(searchText);

    } catch (err) {
        console.error('❌', err.message);
    } finally {
        try { await client.close(); } catch (_) {}
    }
}

run();
