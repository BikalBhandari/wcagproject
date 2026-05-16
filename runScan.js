const fs = require('fs');
const path = require('path');
const pLimitLib = require('p-limit');
const pLimit = pLimitLib.default || pLimitLib;
const { getPageContext } = require('./core/auditor');
const { scopes: SCOPES } = require('./config/scopes.config');
const { processIssues } = require('./utils/postProcessor');
const { readAgentConfig } = require('./utils/agentConfig');
const { createLogger } = require('./utils/logger');

const SCOPE_DATA_DIR = path.join(__dirname, 'data', 'scopes');
const logger = createLogger('scan');
const confidenceRank = {
    low: 1,
    medium: 2,
    high: 3
};

function loadAgentFleetConfig() {
    try {
        return readAgentConfig();
    } catch (err) {
        logger.warn('Could not read agent fleet config', err);
        return { agents: [] };
    }
}

function normalizeConfidenceFloor(value) {
    const normalized = String(value || 'low').trim().toLowerCase();
    if (['high', 'high only'].includes(normalized)) return 'high';
    if (['medium', 'medium+', 'medium or higher'].includes(normalized)) return 'medium';
    return 'low';
}

function applyAgentOutputLimits(issues, config = {}) {
    if (!Array.isArray(issues) || issues.length === 0) return [];

    const minConfidence = normalizeConfidenceFloor(config.minConfidence);
    const minConfidenceRank = confidenceRank[minConfidence] || confidenceRank.low;
    const maxFindings = parseInt(config.maxFindingsPerPage, 10);

    let filtered = issues.filter(issue => {
        const issueConfidence = String(issue.confidence || 'high').trim().toLowerCase();
        const issueRank = confidenceRank[issueConfidence] || confidenceRank.high;
        return issueRank >= minConfidenceRank;
    });

    if (Number.isFinite(maxFindings) && maxFindings > 0) {
        filtered = filtered.slice(0, maxFindings);
    }

    return filtered;
}

/**
 * Runs a scan for a given scope using a list of audit agents.
 * 
 * @param {string} scopeInput - Name of scope (e.g. 'core') or path to JSON file.
 * @param {Array<string>} agentNames - List of agent names to execute.
 * @param {number} concurrency - Number of pages to scan concurrently.
 * @returns {Promise<Array>} - All issues found.
 */
async function runScan(scopeInput, agentNames = ['altTextAgent'], concurrency = 10, progressCallback = null, options = {}) {
    const agentRegistry = require('./agents');
    let urls = [];
    const stats = {
        totalPages: 0,
        totalImages: 0,
        urlsWithIssues: new Set(),
        scanErrors: 0,
        severity: { high: 0, medium: 0, low: 0 },
        types: { presence: 0, quality: 0 }
    };

    // 1. Resolve Scope
    const resolvedScopeInput = String(scopeInput || '').trim();
    if (!resolvedScopeInput) {
        throw new Error('Scope input is required.');
    }

    if (SCOPES[resolvedScopeInput.toLowerCase()]) {
        scopeInput = SCOPES[resolvedScopeInput.toLowerCase()];
    } else {
        scopeInput = resolvedScopeInput;
    }

    if (scopeInput.endsWith('.json')) {
        let jsonPath = scopeInput;
        if (!path.isAbsolute(scopeInput)) {
            // Check current directory, then SCOPE_DATA_DIR
            if (!fs.existsSync(jsonPath)) {
                jsonPath = path.join(SCOPE_DATA_DIR, scopeInput);
            }
            // If still not found, check if it's a filename in SCOPE_DATA_DIR
            if (!fs.existsSync(jsonPath)) {
                const fileName = path.basename(scopeInput);
                jsonPath = path.join(SCOPE_DATA_DIR, fileName);
            }
        }

        if (fs.existsSync(jsonPath)) {
            const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            if (!Array.isArray(parsed)) {
                throw new Error(`Scope file must contain an array of URLs: ${jsonPath}`);
            }
            urls = parsed;
        } else {
            throw new Error(`Scope file not found: ${jsonPath}`);
        }
    } else if (scopeInput.startsWith('http')) {
        const Sitemapper = require('sitemapper').default || require('sitemapper');
        const sitemap = new Sitemapper({ url: scopeInput, timeout: 15000 });
        const result = await sitemap.fetch();
        urls = Array.isArray(result.sites) ? result.sites : [];
    } else {
        throw new Error('Invalid scope input. Must be a registered scope name or a JSON file path.');
    }

    // 2. Resolve Agents
    const agents = agentNames
        .map(name => agentRegistry[name])
        .filter(agent => agent != null);
    const fleetConfig = loadAgentFleetConfig();
    const agentConfigMap = new Map(
        (fleetConfig.agents || []).map(agent => [agent.name, agent.config || {}])
    );

    if (agents.length === 0) {
        throw new Error(`No valid agents found for: ${agentNames.join(', ')}`);
    }

    if (!urls || urls.length === 0) {
        return { issues: [], stats };
    }

    const concurrencyInt = Math.max(1, parseInt(concurrency) || 10);
    const limit = pLimit(concurrencyInt);

    logger.info('Starting scan', {
        scope: scopeInput,
        urlCount: urls.length,
        agents: agents.map(a => a.name),
        concurrency: concurrencyInt
    });

    const allIssues = [];
    const isScanError = issue => issue.type === 'system' && issue.subType === 'Network Error';

    let processedCount = 0;
    const totalCount = urls.length;

    const tasks = urls.map(url => limit(async () => {
        try {
            logger.debug('Scanning URL', { url });
            const context = await getPageContext(url, { timeout: options.timeout });
            
            if (context.error) {
                allIssues.push({
                    type: 'system',
                    subType: 'Network Error',
                    page: url,
                    element: 'N/A',
                    message: `Failed to fetch page: ${context.error}`,
                    severity: 'high',
                    recommendation: 'Check if the URL is accessible and the server is responding.',
                    wcag: []
                });
                stats.scanErrors++;
                stats.urlsWithIssues.add(url);
            } else {
                stats.totalPages++;
                const imgCount = context.$ ? context.$('img').length : 0;
                stats.totalImages += imgCount;

                for (const agent of agents) {
                    try {
                        const agentConfig = agentConfigMap.get(agent.name) || {};
                        const rawIssues = await agent.run(context, agentConfig);
                        const filteredIssues = applyAgentOutputLimits(rawIssues, agentConfig);
                        if (Array.isArray(filteredIssues) && filteredIssues.length > 0) {
                            // Inject agent name into each issue
                            const issues = filteredIssues.map(issue => ({
                                ...issue,
                                agent: agent.name || 'unknown'
                            }));
                            allIssues.push(...issues);
                            stats.urlsWithIssues.add(url);
                            
                            // Track stats
                            issues.forEach(issue => {
                                if (stats.severity[issue.severity] !== undefined) {
                                    stats.severity[issue.severity]++;
                                }
                                
                                // Dynamically track issue types
                                if (!stats.types[issue.type]) {
                                    stats.types[issue.type] = 0;
                                }
                                stats.types[issue.type]++;
                            });
                        }
                    } catch (err) {
                        logger.error(`Agent ${agent.name} failed on URL`, { url, error: err.message });
                    }
                }
            }
        } catch (err) {
            logger.error('Unexpected scan error', { url, error: err.message });
        } finally {
            processedCount++;
            if (progressCallback) {
                // Real-time deduplication for accurate progress reporting
                const currentMerged = processIssues(allIssues.filter(issue => !isScanError(issue)), 'qa');
                
                progressCallback({
                    processed: processedCount,
                    total: totalCount,
                    currentUrl: url,
                    issueCount: currentMerged.length
                });
            }
        }
    }));

    await Promise.all(tasks);

    return {
        issues: allIssues, 
        stats: {
            ...stats,
            urlsWithIssues: stats.urlsWithIssues.size,
            totalIssues: allIssues.filter(issue => !isScanError(issue)).length
        } 
    };
}

module.exports = { runScan };
