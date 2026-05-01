require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { runScan } = require('./runScan');
const { writeReport } = require('./reporting/csvWriter');
const { sendResultsToCoda } = require('./reporting/codaClient');
const urlUtils = require('./utils/urlUtils');
const { validateIssue } = require('./utils/issueSchema');
const { processIssues } = require('./utils/postProcessor');

async function runAudit(input, agents = ['altTextAgent', 'altQualityAgent'], concurrency = 10, progressCallback = null) {
    let reportName = 'audit-report.csv';
    const timestamp = urlUtils.getTimestamp();

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
        const { issues: rawIssues, stats: rawStats } = await runScan(input || 'core', agents, 10, progressCallback);

        // --- POST-PROCESSING PIPELINE ---
        console.log(`🛠️  Post-processing ${rawIssues.length} raw issues...`);
        
        // 1. Validate Schema
        const validatedIssues = rawIssues.map(issue => {
            try {
                return validateIssue(issue);
            } catch (err) {
                // validateIssue already logs a warning
                return null;
            }
        }).filter(Boolean);

        // 2. Dedupe, Suppress, and Sort
        const finalIssues = processIssues(validatedIssues);
        
        console.log(`✅ Post-processing complete. ${finalIssues.length} issues remaining.`);

        // 3. Update Stats based on processed issues
        const stats = {
            ...rawStats,
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

        // Write report (CSV — existing behavior)
        const reportPath = path.join(__dirname, 'output', 'reports', reportName);
        await writeReport(reportPath, issues);

        const scopeBaseName = path.basename(input || 'scan', '.json');
        let codaInfo = null;
        // Send to Coda via MCP (non-blocking — failures do not interrupt scan)
        try {
            console.log('📤 Sending results to Coda...');
            codaInfo = await sendResultsToCoda(issues, {
                scanName: scopeBaseName,
                folderName: 'Accessibility Audits'
            });
            console.log('✅ Coda upload complete');
        } catch (codaErr) {
            console.warn(`⚠️  Coda upload failed: ${codaErr.message}`);
        }

        // Write metadata
        const metaPath = reportPath.replace('.csv', '.json');
        fs.writeFileSync(metaPath, JSON.stringify({
            ...stats,
            agents, // Include list of agents in metadata
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
                codaUrl: codaInfo?.url || null
            }
        };
    } catch (error) {
        console.error('❌ Audit failed:', error.message);
        return { error: error.message };
    }
}

module.exports = { runAudit };

// CLI argument handling
if (require.main === module) {
    const inputArg = process.argv[2];
    runAudit(inputArg);
}

