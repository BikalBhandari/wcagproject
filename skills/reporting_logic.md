# Skill: Reporting Logic (csv-writer)

## Overview
Audit results are persisted to the filesystem as CSV files for long-term analysis and stakeholder sharing.

## Library
- **csv-writer**: Provides a stream-based or batch-based way to write objects to a CSV file with defined headers.

## Data Schema
Reports include the following columns:
- `PAGE_URL`: The source page.
- `IMAGE_SRC`: The image location.
- `ALT_TEXT`: The raw alt text (or indicators like `[MISSING]`).
- `STATUS`: The classification (VALID, INVALID, MISSING, EMPTY).

## Implementation Pattern
```javascript
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: reportFilename,
    header: [
        { id: 'page', title: 'PAGE_URL' },
        { id: 'src', title: 'IMAGE_SRC' },
        { id: 'alt', title: 'ALT_TEXT' },
        { id: 'status', title: 'STATUS' }
    ]
});

await csvWriter.writeRecords(records);
```

## Best Practices
- Name reports based on the input JSON file (e.g., `asuo_core.json` -> `asuo_core-report.csv`).
- Ensure the directory has write permissions.
- Provide a clear download link in the UI once the file is written.
