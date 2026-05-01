require('dotenv').config();
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

async function run() {
    const transport = new StreamableHTTPClientTransport(
        new URL('https://coda.io/apis/mcp'),
        { requestInit: { headers: { 'Authorization': 'Bearer ' + process.env.CODA_API_TOKEN } } }
    );
    const client = new Client({ name: 'debug', version: '1.0.0' }, { capabilities: { tools: {} } });

    try {
        await client.connect(transport);
        
        const docUri = 'coda://docs/sBgeQGm5Gm';
        const pageTitle = 'Debug Page ' + Date.now();
        
        console.log('1. Creating page...');
        const pageRes = await client.callTool({
            name: 'page_create',
            arguments: { uri: docUri, title: pageTitle }
        });
        console.log('Page Response:', pageRes.content[0].text);
        const pageData = JSON.parse(pageRes.content[0].text).result;
        let pageUri = pageData.pageUri || pageData.uri;
        if (!pageUri.startsWith('coda://')) pageUri = docUri + '/' + pageUri;
        console.log('Page URI:', pageUri);

        console.log('2. Creating table...');
        const tableRes = await client.callTool({
            name: 'table_create',
            arguments: {
                uri: pageUri,
                name: 'Debug Table',
                columns: [{ name: 'Col1', type: 'text' }]
            }
        });
        const tableData = JSON.parse(tableRes.content[0].text).result;
        const tableUri = tableData.tableUri || tableData.uri;
        console.log('Table URI:', tableUri);

        console.log('3. Reading columns...');
        const colsRes = await client.callTool({
            name: 'table_columns_read',
            arguments: { uri: tableUri }
        });
        console.log('Columns:', colsRes.content[0].text);

        console.log('4. Inserting row with NAME...');
        const rowRes = await client.callTool({
            name: 'table_rows_manage',
            arguments: {
                uri: tableUri,
                data: {
                    action: 'add',
                    rows: [{ cells: [{ column: 'Col1', value: 'Test Value' }] }]
                }
            }
        });
        console.log('Insert Result:', rowRes.content[0].text);

    } catch (err) {
        console.error(err);
    } finally {
        try { await client.close(); } catch (_) {}
    }
}
run();
