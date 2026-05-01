const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

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
            { id: 'confidence', title: 'CONFIDENCE' },
            { id: 'requiresReview', title: 'REQUIRES_REVIEW' }
        ]

    });

    await csvWriter.writeRecords(records);
}

module.exports = { writeReport };
