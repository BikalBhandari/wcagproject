require('dotenv').config();
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

async function run() {
    const transport = new StreamableHTTPClientTransport(
        new URL('https://coda.io/apis/mcp'),
        { requestInit: { headers: { 'Authorization': `Bearer ${process.env.CODA_API_TOKEN}` } } }
    );
    const client = new Client({ name: 'doc-creator', version: '1.0.0' }, { capabilities: { tools: {} } });

    try {
        await client.connect(transport);
        const result = await client.callTool({
            name: 'document_create',
            arguments: { 
                title: 'Accessibility Audit Reports',
                destination: { 
                    folderId: 'fl-6kRDCCxYiT',
                    workspaceId: 'ws-yNiYipD7Vg'
                }
            }
        });
        console.log(result.content[0].text);
    } catch (err) {
        console.error(err);
    } finally {
        try { await client.close(); } catch (_) {}
    }
}
run();
