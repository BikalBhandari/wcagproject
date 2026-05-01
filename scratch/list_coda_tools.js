const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODA_MCP_URL = 'https://coda.io/apis/mcp';

async function listTools() {
    const token = process.env.CODA_API_TOKEN;
    if (!token) {
        console.error('CODA_API_TOKEN not found in .env');
        return;
    }

    const transport = new StreamableHTTPClientTransport(
        new URL(CODA_MCP_URL),
        { requestInit: { headers: { 'Authorization': 'Bearer ' + token } } }
    );

    const client = new Client(
        { name: 'diagnostic-client', version: '1.0.0' },
        { capabilities: {} }
    );

    await client.connect(transport);
    const tools = await client.listTools();
    console.log(JSON.stringify(tools, null, 2));
    await client.close();
}

listTools().catch(console.error);
