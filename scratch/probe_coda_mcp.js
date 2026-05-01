/**
 * Probe the Coda MCP server using StreamableHTTPClientTransport directly.
 * This bypasses mcp-remote's OAuth flow and sends Bearer token directly.
 * Run: node scratch/probe_coda_mcp.js
 */
require('dotenv').config();

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

const CODA_API_TOKEN = process.env.CODA_API_TOKEN;

if (!CODA_API_TOKEN) {
    console.error('❌ CODA_API_TOKEN not set in .env');
    process.exit(1);
}

async function probeCodaMCP() {
    console.log('🔍 Connecting to Coda MCP server via StreamableHTTP...');
    console.log(`🔑 Token: ${CODA_API_TOKEN.slice(0, 8)}...`);

    const transport = new StreamableHTTPClientTransport(
        new URL('https://coda.io/apis/mcp'),
        {
            requestInit: {
                headers: {
                    'Authorization': `Bearer ${CODA_API_TOKEN}`
                }
            }
        }
    );

    const client = new Client(
        { name: 'coda-audit-probe', version: '1.0.0' },
        { capabilities: { tools: {} } }
    );

    try {
        await client.connect(transport);
        console.log('✅ Connected!\n');

        const { tools } = await client.listTools();
        console.log(`📋 ${tools.length} tools available:\n`);
        tools.forEach(t => {
            console.log(`  🔧 ${t.name}`);
            if (t.description) console.log(`     ${t.description.slice(0, 100)}`);
            if (t.inputSchema?.properties) {
                const keys = Object.keys(t.inputSchema.properties);
                console.log(`     Params: ${keys.join(', ')}`);
            }
            console.log();
        });
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.cause) console.error('   Cause:', err.cause);
    } finally {
        try { await client.close(); } catch(_) {}
    }
}

probeCodaMCP();
