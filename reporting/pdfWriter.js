const puppeteer = require('puppeteer');
const path = require('path');
const { formatWcag, sanitizeElement, formatTimestamp } = require('../utils/formatUtils');

/**
 * Generates a premium PDF report from audit results.
 * @param {string} filePath - Path to save the PDF.
 * @param {Array} records - Audit findings.
 * @param {Object} meta - Metadata about the scan.
 */
async function writePdfReport(filePath, records, meta = {}) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const formattedRecords = records.map(record => ({
        ...record,
        element: sanitizeElement(record.element || ''),
        wcag: formatWcag(record.wcag),
        timestamp: formatTimestamp(new Date())
    }));

    const htmlContent = generateHtml(formattedRecords, meta);
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    await page.pdf({
        path: filePath,
        format: 'A4',
        margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center; color: #888;">Accessibility Audit Report</div>',
        footerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center; color: #888;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
    });

    await browser.close();
}

function generateHtml(records, meta) {
    const timestamp = formatTimestamp(new Date());
    const complianceColor = meta.compliance > 80 ? '#28a745' : (meta.compliance > 50 ? '#ffc107' : '#dc3545');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Inter', -apple-system, sans-serif; color: #333; line-height: 1.5; padding: 20px; }
            .header { border-bottom: 3px solid #8C1D40; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .brand { color: #8C1D40; font-weight: 700; font-size: 24px; }
            .meta-info { text-align: right; font-size: 12px; color: #666; }
            
            .summary-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: flex; gap: 40px; }
            .stat { display: flex; flex-direction: column; }
            .stat-value { font-size: 24px; font-weight: 700; color: #8C1D40; }
            .stat-label { font-size: 12px; text-transform: uppercase; color: #666; }
            
            .compliance-circle { width: 60px; height: 60px; border-radius: 50%; border: 5px solid ${complianceColor}; display: flex; align-items: center; justify-content: center; font-weight: 700; }

            table { width: 100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; }
            th { text-align: left; background: #f8f9fa; padding: 12px; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #dee2e6; }
            td { padding: 12px; font-size: 11px; border-bottom: 1px solid #dee2e6; word-wrap: break-word; vertical-align: top; }
            
            .severity-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .sev-high { background: #f8d7da; color: #721c24; }
            .sev-medium { background: #fff3cd; color: #856404; }
            .sev-low { background: #d4edda; color: #155724; }
            
            .wcag-tag { color: #8C1D40; font-weight: 600; }
            .element-code { background: #f1f3f5; padding: 4px; border-radius: 4px; font-family: monospace; font-size: 10px; display: block; margin-top: 4px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="brand">WCAG Audit Report</div>
            <div class="meta-info">
                <div>Generated: ${timestamp}</div>
                <div>Target: ${meta.scopeName || 'Custom Scan'}</div>
            </div>
        </div>

        <div class="summary-box">
            <div class="stat">
                <div class="compliance-circle">${meta.compliance || 0}%</div>
                <div class="stat-label">Compliance</div>
            </div>
            <div class="stat">
                <span class="stat-value">${meta.totalPages || 0}</span>
                <span class="stat-label">Pages Scanned</span>
            </div>
            <div class="stat">
                <span class="stat-value">${records.length}</span>
                <span class="stat-label">Total Issues</span>
            </div>
        </div>

        <h3>Audit Findings</h3>
        <table>
            <thead>
                <tr>
                    <th width="15%">WCAG / Standard</th>
                    <th width="40%">Issue & Element</th>
                    <th width="10%">Severity</th>
                    <th width="35%">Recommendation</th>
                </tr>
            </thead>
            <tbody>
                ${records.map(r => `
                    <tr>
                        <td>
                            <div class="wcag-tag">${r.wcag}</div>
                            <div style="font-size: 9px; color: #888; margin-top: 4px;">Impact: ${r.impact || 'moderate'}</div>
                        </td>
                        <td>
                            <strong>${r.subType}</strong>
                            <div style="margin-top: 4px;">${r.message}</div>
                            <code class="element-code">${r.element.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
                            <div style="font-size: 9px; color: #666; margin-top: 4px;">URL: ${r.page}</div>
                        </td>
                        <td>
                            <span class="severity-badge sev-${r.severity}">${r.severity}</span>
                        </td>
                        <td>${r.recommendation || 'No specific recommendation provided.'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;
}

module.exports = { writePdfReport };
