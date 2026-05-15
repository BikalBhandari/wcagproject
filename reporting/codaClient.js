'use strict';
/**
 * reporting/codaClient.js
 *
 * Sends audit scan results to a single Coda Doc, creating a new sub-page for each scan.
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

const CODA_MCP_URL = 'https://coda.io/apis/mcp';
const DEFAULT_DOC_ID = 'G__Q5UKx_l';
const BATCH_SIZE = 100;
const COLUMN_NAMES = [
    'Page URL',
    'Issue Type',
    'Sub Type',
    'Element',
    'Message',
    'Severity',
    'Recommendation',
    'WCAG',
    'Impact',
    'Help URL',
    'Timestamp'
];

const { getConfig } = require('../utils/config');
const { formatWcag, sanitizeElement, formatTimestamp } = require('../utils/formatUtils');

async function createCodaClient() {
    const config = getConfig();
    const token = config.codaToken;
    if (!token) throw new Error('CODA_API_TOKEN is not set (check Settings or .env).');

    console.log(`🔌 Initializing Coda MCP with token: ${token.substring(0, 4)}...${token.substring(token.length - 4)}`);

    const transport = new StreamableHTTPClientTransport(
        new URL(CODA_MCP_URL),
        { requestInit: { headers: { 'Authorization': 'Bearer ' + token } } }
    );

    const client = new Client(
        { name: 'accessibility-audit-client', version: '1.3.0' },
        { capabilities: { tools: {} } }
    );

    await client.connect(transport);
    return client;
}

async function callTool(client, toolName, args) {
    console.log(`🛠️  Calling tool: ${toolName}...`);
    const result = await client.callTool({ name: toolName, arguments: args });
    
    if (result?.isError) {
        const errorText = result.content?.find(c => c.type === 'text')?.text || 'Unknown error';
        throw new Error(`MCP Tool Error (${toolName}): ${errorText}`);
    }

    if (!result?.content) return result;
    const textContent = result.content.find(c => c.type === 'text');
    if (!textContent) return result;

    try {
        const parsed = JSON.parse(textContent.text);
        // Check for error field in the JSON response
        if (parsed.error) {
            throw new Error(`Coda API Error: ${parsed.error.message || JSON.stringify(parsed.error)}`);
        }
        // Coda MCP often returns { toolName: "...", result: { ... } }
        return parsed.result !== undefined ? parsed.result : parsed;
    } catch (e) {
        if (e.message.startsWith('Coda API Error') || e.message.startsWith('MCP Tool Error')) throw e;
        return textContent.text;
    }
}

function mapIssueToRow(issue) {
    return [
        String(issue.page || '').slice(0, 1000),
        String(issue.type || ''),
        String(issue.subType || ''),
        sanitizeElement(issue.element || '').slice(0, 1000),
        String(issue.message || '').slice(0, 1000),
        String(issue.severity || ''),
        String(issue.recommendation || '').slice(0, 1000),
        formatWcag(issue.wcag),
        String(issue.impact || ''),
        String(issue.helpUrl || '').slice(0, 500),
        formatTimestamp(new Date())
    ];
}

async function sendResultsToCoda(results, options = {}) {
    const issues = results || [];

    const scanName = options.scanName || 'Scan';
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const pageTitle = `Report: ${scanName} (${timestamp})`;
    const config = getConfig();
    const docId = config.codaDocId || DEFAULT_DOC_ID;
    const docUri = `coda://docs/${docId}`;

    const client = await createCodaClient();

    try {
        console.log(`📂 Using Doc: ${docUri}`);

        // 1. Create Page
        console.log(`➕ Creating page: "${pageTitle}"`);
        const pageResult = await callTool(client, 'page_create', {
            uri: docUri,
            title: pageTitle
        });

        let pageUri = pageResult?.pageUri || pageResult?.uri || pageResult?.id || (typeof pageResult === 'string' ? pageResult : null);
        if (pageUri && !pageUri.startsWith('coda://')) {
            // Ensure we don't double up on docId if it's already in the URI
            if (pageUri.includes(docId)) {
                pageUri = `coda://docs/${pageUri.startsWith('/') ? pageUri.slice(1) : pageUri}`;
            } else {
                // If it's just an ID or a relative path like pages/..., prefix it
                const path = pageUri.startsWith('pages/') ? pageUri : `pages/${pageUri}`;
                pageUri = `${docUri}/${path}`;
            }
        }
        
        if (!pageUri || !pageUri.includes('pages/')) {
            throw new Error(`Could not resolve valid page URI. Response: ${JSON.stringify(pageResult)}`);
        }
        console.log(`📍 Resolved Page URI: ${pageUri}`);

        // 2. Prepare initial rows
        const rows = results.map(mapIssueToRow);
        const firstBatch = rows.slice(0, BATCH_SIZE);
        const remainingRows = rows.slice(BATCH_SIZE);

        console.log(`📊 Creating Coda report table...`);
        const tableResult = await callTool(client, 'table_create', {
            uri: pageUri,
            name: 'Audit Results',
            columns: COLUMN_NAMES.map(name => ({
                name,
                type: name === 'Timestamp' ? 'date' : 'text'
            })),
            rows: firstBatch
        });

        let tableUri = tableResult?.tableUri || tableResult?.uri || tableResult?.id || (typeof tableResult === 'string' ? tableResult : null);
        if (tableUri && !tableUri.startsWith('coda://')) {
            if (tableUri.includes(docId)) {
                tableUri = `coda://docs/${tableUri.startsWith('/') ? tableUri.slice(1) : tableUri}`;
            } else {
                const path = tableUri.startsWith('tables/') ? tableUri : `tables/${tableUri}`;
                tableUri = `${docUri}/${path}`;
            }
        }

        if (!tableUri || !tableUri.includes('tables/')) {
            throw new Error(`Could not resolve valid table URI. Response: ${JSON.stringify(tableResult)}`);
        }
        console.log(`📍 Resolved Table URI: ${tableUri}`);

        // 3. Insert remaining rows if any
        if (remainingRows.length > 0) {
            console.log(`📥 Inserting ${remainingRows.length} remaining rows in ${Math.ceil(remainingRows.length / BATCH_SIZE)} batches...`);
            for (let i = 0; i < remainingRows.length; i += BATCH_SIZE) {
                const batch = remainingRows.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                console.log(`   ⏳ Syncing Batch ${batchNum} (${batch.length} rows)...`);
                
                try {
                    await callTool(client, 'table_rows_manage', {
                        uri: tableUri,
                        data: {
                            action: 'add',
                            columnIds: COLUMN_NAMES,
                            rows: batch
                        }
                    });
                    console.log(`   ✅ Batch ${batchNum} successfully added.`);
                } catch (batchErr) {
                    console.error(`   ❌ Failed to add Batch ${batchNum}: ${batchErr.message}`);
                    // Continue with other batches instead of failing the whole scan
                }
            }
        }

        console.log(`✅ Coda Report Complete: ${pageTitle}`);
        
        // Return the final shareable URL
        const pageId = pageUri.split('/').pop(); // Extract page ID from coda://docs/docId/pages/pageId
        const codaUrl = `https://coda.io/d/_d${docId}/${pageId}`;
        
        return {
            title: pageTitle,
            url: codaUrl,
            pageUri
        };

    } catch (err) {
        console.error('❌ Coda Integration Error:', err.message);
        throw err;
    } finally {
        try { await client.close(); } catch (_) {}
    }
}

module.exports = { sendResultsToCoda };
