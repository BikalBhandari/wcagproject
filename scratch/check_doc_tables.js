require('dotenv').config();
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

async function run() {
    const transport = new StreamableHTTPClientTransport(
        new URL('https://coda.io/apis/mcp'),
        { requestInit: { headers: { 'Authorization': `Bearer ${process.env.CODA_API_TOKEN}` } } }
    );
    const client = new Client({ name: 'checker', version: '1.0.0' }, { capabilities: { tools: {} } });

    try {
        await client.connect(transport);
        // List pages to find the latest one
        const docUri = 'coda://docs/sBgeQGm5Gm';
        const docData = await client.callTool({
            name: 'document_read',
            arguments: { uri: docUri, contentTypesToInclude: ['tables'] }
        });
        console.log(JSON.stringify(docData, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        try { await client.close(); } catch (_) {}
    }
}
run();
