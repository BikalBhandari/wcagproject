const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const { formatWcag, sanitizeElement, formatTimestamp } = require('../utils/formatUtils');

async function writeReport(filePath, records) {
    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: 'agent', title: 'AGENT' },
            { id: 'type', title: 'CATEGORY' },
            { id: 'subType', title: 'ISSUE_TYPE' },
            { id: 'page', title: 'PAGE_URL' },
            { id: 'element', title: 'ELEMENT' },
            { id: 'message', title: 'MESSAGE' },
            { id: 'severity', title: 'SEVERITY' },
            { id: 'recommendation', title: 'RECOMMENDATION' },
            { id: 'wcag', title: 'WCAG' },
            { id: 'impact', title: 'IMPACT' },
            { id: 'helpUrl', title: 'HELP_URL' },
            { id: 'timestamp', title: 'TIMESTAMP' }
        ]
    });

    const formattedRecords = records.map(record => ({
        ...record,
        element: sanitizeElement(record.element || ''),
        wcag: formatWcag(record.wcag),
        timestamp: formatTimestamp(new Date())
    }));

    await csvWriter.writeRecords(formattedRecords);
}

module.exports = { writeReport };
