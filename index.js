require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { runScan } = require('./runScan');
const { writeReport } = require('./reporting/csvWriter');
const { sendResultsToCoda } = require('./reporting/codaClient');
const urlUtils = require('./utils/urlUtils');
const { validateIssue } = require('./utils/issueSchema');
const { processIssues } = require('./utils/postProcessor');
const { createLogger } = require('./utils/logger');
const { ensureDir } = require('./utils/runtimeStore');
const { getConfig } = require('./utils/config');

const { writePdfReport } = require('./reporting/pdfWriter');
const logger = createLogger('audit');
const REPORTS_DIR = path.join(__dirname, 'output', 'reports');

async function runAudit(input, agents = ['altTextAgent', 'altQualityAgent'], concurrency = 10, progressCallback = null) {
    let reportName = 'audit-report.csv';
    const timestamp = urlUtils.getTimestamp();
    const startedAt = Date.now();
    const runtimeConfig = getConfig();

    try {
        // Resolve report name based on input and agents
        const agentSuffix = agents.length === 1 ? 
            `-${agents[0].replace('Agent', '')}` : 
            (agents.length > 1 ? '-fleet' : '');
            
        if (input && !input.startsWith('http')) {
            const baseName = path.basename(input, '.json');
            reportName = `${baseName}${agentSuffix}-report-${timestamp}.csv`;
        } else {
            reportName = `sitemap${agentSuffix}-report-${timestamp}.csv`;
        }

        // Run the scan using the new separated logic
        const { issues: rawIssues, stats: rawStats } = await runScan(
            input || 'core',
            agents,
            concurrency,
            progressCallback,
            { timeout: runtimeConfig.timeout }
        );

        // --- POST-PROCESSING PIPELINE ---
        logger.info('Post-processing raw issues', { rawIssues: rawIssues.length });
        
        // 1. Validate Schema
        const validatedIssues = rawIssues.map(issue => {
            try {
                return validateIssue(issue);
            } catch (err) {
                // validateIssue already logs a warning
                return null;
            }
        }).filter(Boolean);

        const isScanError = issue => issue.type === 'system' && issue.subType === 'Network Error';
        const scanErrors = validatedIssues.filter(isScanError);
        const accessibilityIssues = validatedIssues.filter(issue => !isScanError(issue));

        // 2. Dedupe, Suppress, and Sort
        const finalIssues = processIssues(accessibilityIssues, 'qa');
        
        logger.info('Post-processing complete', {
            rawIssues: rawIssues.length,
            validatedIssues: validatedIssues.length,
            finalIssues: finalIssues.length
        });

        // 3. Update Stats based on processed issues
        const stats = {
            ...rawStats,
            scanErrors: scanErrors.length,
            totalIssues: finalIssues.length,
            severity: { high: 0, medium: 0, low: 0 },
            types: {}
        };

        finalIssues.forEach(issue => {
            if (stats.severity[issue.severity] !== undefined) {
                stats.severity[issue.severity]++;
            }
            if (!stats.types[issue.type]) {
                stats.types[issue.type] = 0;
            }
            stats.types[issue.type]++;
        });

        const issues = finalIssues;
        const scopeBaseName = path.basename(input || 'scan', '.json');

        // Write report (CSV — existing behavior)
        ensureDir();
        if (!fs.existsSync(REPORTS_DIR)) {
            fs.mkdirSync(REPORTS_DIR, { recursive: true });
        }

        const reportPath = path.join(REPORTS_DIR, reportName);
        await writeReport(reportPath, issues);

        // --- PDF GENERATION ---
        const pdfPath = reportPath.replace('.csv', '.pdf');
        try {
            logger.info('Generating PDF report');
            // Calculate compliance for the PDF header
            const pages = stats.totalPages || 1;
            const high = stats.severity?.high || 0;
            const medium = stats.severity?.medium || 0;
            const low = stats.severity?.low || 0;
            const weightedScore = (high * 15) + (medium * 5) + (low * 2);
            const calculatedCompliance = 100 - (weightedScore / pages * 2);
            const compliance = Math.max(0, Math.min(100, parseFloat(calculatedCompliance.toFixed(1))));

            await writePdfReport(pdfPath, issues, {
                ...stats,
                compliance,
                scopeName: path.basename(input || 'scan', '.json')
            });
            logger.info('PDF report complete');
        } catch (pdfErr) {
            logger.warn('PDF generation failed', pdfErr);
        }

        let codaInfo = null;
        // Send to Coda via MCP (non-blocking — failures do not interrupt scan)
        try {
            logger.info('Sending results to Coda');
            codaInfo = await sendResultsToCoda(issues, {
                scanName: scopeBaseName,
                folderName: 'Accessibility Audits'
            });
            logger.info('Coda upload complete', { url: codaInfo?.url || null });
        } catch (codaErr) {
            logger.warn('Coda upload failed', codaErr);
        }

        // --- METADATA ENRICHMENT ---
        let targetUrl = 'Unknown';
        const absoluteScopePath = input && !input.startsWith('http') ? path.join(__dirname, 'data', 'scopes', input) : null;
        
        if (input && input.startsWith('http')) {
            targetUrl = input;
        } else if (absoluteScopePath && fs.existsSync(absoluteScopePath)) {
            try {
                const content = JSON.parse(fs.readFileSync(absoluteScopePath, 'utf8'));
                if (Array.isArray(content) && content.length > 0) {
                    targetUrl = content[0];
                } else if (content.url) {
                    targetUrl = content.url;
                }
            } catch (e) {
                // Fallback to basename
            }
        }
        const domain = urlUtils.getDomain(targetUrl);

        const completedAt = Date.now();
        const durationMs = Math.max(0, completedAt - startedAt);

        // Write metadata
        const metaPath = reportPath.replace('.csv', '.json');
        fs.writeFileSync(metaPath, JSON.stringify({
            ...stats,
            name: path.basename(reportName, '.csv'), // Crucial for UI
            scopeName: scopeBaseName,
            targetUrl,
            domain,
            agents, // Include list of agents in metadata
            startedAt: new Date(startedAt).toISOString(),
            completedAt: new Date(completedAt).toISOString(),
            durationMs,
            generatedAt: new Date().toISOString(),
            codaUrl: codaInfo?.url || null
        }, null, 2));

        const totalIssues = issues.length;
        

        return {
            success: true,
            totalIssues,
            reportFile: reportName,
            stats: {
                ...stats,
                name: path.basename(reportName, '.csv'),
                durationMs,
                codaUrl: codaInfo?.url || null
            }
        };
    } catch (error) {
        logger.error('Audit failed', error);
        return { error: error.message };
    }
}

module.exports = { runAudit };

// CLI argument handling
if (require.main === module) {
    const inputArg = process.argv[2];
    const agentsArg = process.argv.slice(3);
    runAudit(inputArg, agentsArg.length > 0 ? agentsArg : undefined);
}
