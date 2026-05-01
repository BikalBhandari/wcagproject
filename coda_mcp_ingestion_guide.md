# Coda MCP Ingestion Guide: Direct Project Ingestion

This guide explains how to set up and use the Coda Model Context Protocol (MCP) server to ingest project data (audit reports, task lists, logs) directly into Coda documents using AI-driven prompts.

## 1. Prerequisites

### Coda API Token
- Go to your [Coda Account Settings](https://coda.io/account).
- Scroll to **API Settings** and generate a new API token.
- **Important**: Keep this token secure. You will need it for the MCP configuration.

### Coda MCP Server URL
The official Coda MCP endpoint is:
`https://coda.io/apis/mcp`

---

## 2. MCP Configuration

To enable an AI assistant to talk to Coda, add the following to your MCP configuration (e.g., `mcp_config.json` or your IDE's MCP settings):

```json
{
  "mcpServers": {
    "Coda": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://coda.io/apis/mcp",
        "--header",
        "Authorization: Bearer YOUR_CODA_API_TOKEN"
      ]
    }
  }
}
```

---

## 3. The "Two-Step Ingestion" Strategy

For reliable data ingestion (especially for reports), use the **Two-Step Atomic Creation** pattern. This prevents issues with tables appearing empty while Coda indexes them.

### Step 1: Create the Container (Page)
Prompt the AI to create a new page within a specific "Master Doc".
> **Prompt Example:** "Create a new sub-page in the Coda doc `G__Q5UKx_l` titled 'Report: [Scan Name]'. Return the page URI."

### Step 2: Create Table with Data (Atomic)
Instead of creating a table and then adding rows, define the table and the first batch of data in a single call.
> **Prompt Example:** "In the new page `[Page URI]`, create a table named 'Audit Results' with columns [Page URL, Issue, Severity]. **Populate it immediately** with the following rows: [[url1, 'Alt Text missing', 'High'], [url2, 'Low contrast', 'Medium']]."

---

## 4. Technical Implementation Details

If you are writing code (JavaScript/Node.js) to automate this via the MCP SDK:

### Data Structure for Rows
The Coda MCP server uses **positional value arrays** rather than object mapping for row insertion.

**Correct Format:**
```javascript
// Map your issues to simple arrays
const rows = issues.map(issue => [
    issue.url,
    issue.type,
    issue.severity
]);

// Call table_create with 'rows' parameter
await codaClient.callTool('table_create', {
    uri: pageUri,
    name: 'Audit Results',
    columns: [
        { name: 'Page URL', type: 'text' },
        { name: 'Issue', type: 'text' },
        { name: 'Severity', type: 'text' }
    ],
    rows: rows.slice(0, 100) // First 100 rows included atomically
});
```

### Handling Large Data Sets
If you have more than 100 rows:
1. Use `table_create` for the first 100.
2. Use `table_rows_manage` with `action: "add"` and `columnIds` for subsequent batches.

---

## 5. Troubleshooting "Empty Tables"
If tables appear but rows are missing:
- **Check Schema**: Ensure you are sending `rows` as an array of arrays, not an array of objects.
- **Verify columnIds**: In `table_rows_manage`, you MUST provide the `columnIds` (the names of the columns) in the exact order of your value arrays.
- **Absolute URIs (CRITICAL)**: The Coda MCP server requires absolute URIs for all tool arguments. 
    - **Wrong**: `pages/section-123`
    - **Right**: `coda://docs/DocID/pages/section-123`
    - **Tip**: Always normalize your URIs before calling tools:
      ```javascript
      if (uri && !uri.startsWith('coda://')) {
          uri = `coda://docs/${docId}/${uri}`;
      }
      ```

---

## 6. Recommended Prompts for Users
When asking an AI to manage your Coda ingestion, use these specific terms:
- "Use the **table_create** tool with the **rows** argument to initialize data."
- "Ensure the **columnIds** match the order of the value arrays."
- "Create a new **sub-page** for every distinct report to keep the Doc organized."
