require('dotenv').config();
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

async function getDocUrl() {
    const transport = new StreamableHTTPClientTransport(
        new URL('https://coda.io/apis/mcp'),
        { requestInit: { headers: { 'Authorization': `Bearer ${process.env.CODA_API_TOKEN}` } } }
    );
    const client = new Client({ name: 'url-probe', version: '1.0.0' }, { capabilities: { tools: {} } });

    try {
        await client.connect(transport);

        const result = await client.callTool({
            name: 'url_convert',
            arguments: { action: 'encode', uri: 'coda://docs/NPgjKhhXI7' }
        });

        const text = result?.content?.find(c => c.type === 'text')?.text || '';
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }

        console.log('\n📎 Coda Doc URL:');
        console.log(parsed?.result?.url || parsed?.url || JSON.stringify(parsed));
    } finally {
        try { await client.close(); } catch (_) {}
    }
}

getDocUrl();
