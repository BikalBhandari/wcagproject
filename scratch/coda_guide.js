/**
 * Get tool_guide info for document, table, and content topics.
 * Run: node scratch/coda_guide.js
 */
require('dotenv').config();

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

async function getGuide(topic) {
    const transport = new StreamableHTTPClientTransport(
        new URL('https://coda.io/apis/mcp'),
        { requestInit: { headers: { 'Authorization': `Bearer ${process.env.CODA_API_TOKEN}` } } }
    );
    const client = new Client({ name: 'guide-probe', version: '1.0.0' }, { capabilities: { tools: {} } });

    try {
        await client.connect(transport);
        const result = await client.callTool({ name: 'tool_guide', arguments: { topic } });
        console.log(`\n===== GUIDE: ${topic} =====`);
        const text = result?.content?.find(c => c.type === 'text')?.text || JSON.stringify(result);
        console.log(text);
    } finally {
        try { await client.close(); } catch (_) {}
    }
}

async function whoami() {
    const transport = new StreamableHTTPClientTransport(
        new URL('https://coda.io/apis/mcp'),
        { requestInit: { headers: { 'Authorization': `Bearer ${process.env.CODA_API_TOKEN}` } } }
    );
    const client = new Client({ name: 'guide-probe', version: '1.0.0' }, { capabilities: { tools: {} } });

    try {
        await client.connect(transport);
        const result = await client.callTool({ name: 'whoami', arguments: {} });
        console.log('\n===== WHOAMI =====');
        const text = result?.content?.find(c => c.type === 'text')?.text || JSON.stringify(result);
        console.log(text);
    } finally {
        try { await client.close(); } catch (_) {}
    }
}

(async () => {
    await whoami();
    await getGuide('document');
    await getGuide('table');
})();
