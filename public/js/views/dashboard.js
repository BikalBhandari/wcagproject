import { state } from '../modules/state.js';

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    if (start === end) {
        obj.textContent = end.toLocaleString();
        return;
    }

    const range = end - start;
    const minTimer = 50;
    let stepTime = Math.abs(Math.floor(duration / range));
    stepTime = Math.max(stepTime, minTimer);
    const startTime = Date.now();
    const endTime = startTime + duration;
    let timer;

    function run() {
        const now = Date.now();
        const remaining = Math.max((endTime - now) / duration, 0);
        const value = Math.round(end - (remaining * range));
        obj.textContent = value.toLocaleString();
        if (value === end) {
            clearInterval(timer);
        }
    }

    timer = setInterval(run, stepTime);
    run();
}

function formatLabel(value = '') {
    return value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase())
        .trim();
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolveSiteName(report) {
    if (!report) return 'Unknown Site';

    if (report.meta?.scopeName) {
        return formatLabel(report.meta.scopeName);
    }

    if (report.meta?.domain) {
        return report.meta.domain;
    }

    if (report.meta?.targetUrl) {
        try {
            return new URL(report.meta.targetUrl).hostname;
        } catch (e) {
            // ignore and fall through
        }
    }

    const reportName = report.file || '';
    const cleanReportName = reportName.toLowerCase();
    const scope = state.scopes.find(s => {
        const scopeBase = s.file.replace('.json', '').toLowerCase();
        return cleanReportName.startsWith(scopeBase);
    });

    if (scope) {
        return scope.domain || scope.name;
    }

    const prefix = reportName.split('-')[0].replace(/_/g, ' ');
    return formatLabel(prefix);
}

function getComplianceLabel(compliance) {
    if (compliance >= 90) return { label: 'Healthy', className: 'excellent' };
    if (compliance >= 70) return { label: 'Needs Review', className: 'warning' };
    return { label: 'Action Needed', className: 'critical' };
}

function getAgentTitle(agentId) {
    const agent = (state.agents || []).find(a => a.name === agentId);
    return agent ? agent.title : formatLabel(agentId.replace('Agent', ''));
}

function formatCompactNumber(value = 0) {
    return Number(value || 0).toLocaleString();
}

function formatDensity(issues = 0, pages = 0) {
    if (!pages) return '--';
    const density = issues / pages;
    return density >= 10 ? density.toFixed(1) : density.toFixed(2);
}

function formatDomain(value = '') {
    if (!value) return '--';
    try {
        return new URL(value).hostname;
    } catch (e) {
        return value;
    }
}

function getLatestReportsByScope() {
    const latestReportsByScope = new Map();
    state.reports.forEach(report => {
        const key = (report.meta?.scopeName || report.file || '').split('-')[0].toLowerCase();
        if (!latestReportsByScope.has(key)) {
            latestReportsByScope.set(key, report);
        }
    });
    return Array.from(latestReportsByScope.values());
}

function renderRecentScans() {
    const tbody = document.getElementById('recent-scans-tbody');
    if (!tbody) return;

    if (state.reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-dim);">
                    No reports generated yet.
                </td>
            </tr>
        `;
        return;
    }

    const sortedReports = [...state.reports]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 8);

    tbody.innerHTML = sortedReports.map(report => {
        const compliance = report.compliance;
        const status = getComplianceLabel(compliance);
        const issueCopy = report.meta?.error
            ? report.meta.error
            : (report.missingAlt > 0 ? `${report.missingAlt} issue${report.missingAlt === 1 ? '' : 's'} found` : 'No issues found');

        return `
            <tr>
                <td>
                    <div class="site-cell">
                        <div class="site-icon-mini">${escapeHtml(resolveSiteName(report).charAt(0).toUpperCase())}</div>
                        <div class="site-badge">${escapeHtml(resolveSiteName(report))}</div>
                    </div>
                </td>
                <td>
                    <div class="compliance-cell">
                        <div class="compliance-track">
                            <div class="compliance-fill ${status.className}" style="width: ${compliance}%;"></div>
                        </div>
                        <span class="compliance-value">${compliance}%</span>
                    </div>
                </td>
                <td>
                    <span class="issue-copy ${report.missingAlt > 0 ? 'danger' : 'success'}">${escapeHtml(issueCopy)}</span>
                </td>
                <td class="date-cell">
                    ${escapeHtml(new Date(report.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}
                </td>
                <td>
                    <div class="action-group">
                        <a href="/reports/${report.file}" download="${report.file}" class="action-btn" title="Download CSV">
                            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        </a>
                        <a href="/reports/${report.file.replace('.csv', '.pdf')}" download="${report.file.replace('.csv', '.pdf')}" class="action-btn pdf" title="Download PDF">
                            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        </a>
                        ${report.meta?.codaUrl ? `
                            <a href="${report.meta.codaUrl}" target="_blank" class="action-btn coda" title="View in Coda">
                                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><circle cx="9" cy="9" r="1"/></svg>
                            </a>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderLatestRun(latest) {
    const healthEl = document.getElementById('latest-run-health');
    const siteEl = document.getElementById('latest-run-site');
    const domainEl = document.getElementById('latest-run-domain');
    const pagesEl = document.getElementById('latest-run-pages');
    const imagesEl = document.getElementById('latest-run-images');
    const issuesEl = document.getElementById('latest-run-issues');
    const urlIssuesEl = document.getElementById('latest-run-url-issues');
    const densityEl = document.getElementById('latest-run-density');
    const highEl = document.getElementById('latest-run-high');
    const mediumEl = document.getElementById('latest-run-medium');
    const dateEl = document.getElementById('latest-run-date');
    const agentCountEl = document.getElementById('latest-run-agent-count');
    const agentsEl = document.getElementById('latest-run-agents');
    const focusEl = document.getElementById('latest-run-focus');

    if (!latest) {
        if (healthEl) {
            healthEl.textContent = '--';
            healthEl.className = 'status-badge';
        }
        if (siteEl) siteEl.textContent = 'No runs yet';
        if (domainEl) domainEl.textContent = '--';
        if (pagesEl) pagesEl.textContent = '--';
        if (imagesEl) imagesEl.textContent = '--';
        if (issuesEl) issuesEl.textContent = '--';
        if (urlIssuesEl) urlIssuesEl.textContent = '--';
        if (densityEl) densityEl.textContent = '--';
        if (highEl) highEl.textContent = '--';
        if (mediumEl) mediumEl.textContent = '--';
        if (dateEl) dateEl.textContent = '--';
        if (agentCountEl) agentCountEl.textContent = '--';
        if (agentsEl) agentsEl.textContent = '--';
        if (focusEl) focusEl.textContent = '--';
        return;
    }

    const status = getComplianceLabel(latest.compliance);
    const date = new Date(latest.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const agents = latest.meta?.agents || [];
    const focus = agents.length > 0 ? agents.slice(0, 2).map(getAgentTitle).join(', ') : 'Scan summary';
    const severity = latest.meta?.severity || {};
    const pages = latest.meta?.totalPages || 0;
    const totalImages = latest.meta?.totalImages || 0;
    const totalIssues = latest.meta?.totalIssues || latest.missingAlt || 0;
    const scanErrors = latest.meta?.scanErrors || 0;
    const urlsWithIssues = latest.meta?.urlsWithIssues || 0;
    const domain = formatDomain(latest.meta?.domain || latest.meta?.targetUrl || '--');

    if (healthEl) {
        healthEl.textContent = `${latest.compliance.toFixed(1)}% ${status.label}`;
        healthEl.className = `status-badge ${status.className}`;
    }
    if (siteEl) siteEl.textContent = resolveSiteName(latest);
    if (domainEl) domainEl.textContent = domain;
    if (pagesEl) pagesEl.textContent = formatCompactNumber(pages);
    if (imagesEl) imagesEl.textContent = formatCompactNumber(totalImages);
    if (issuesEl) {
        issuesEl.textContent = formatCompactNumber(totalIssues);
        if (scanErrors > 0) {
            issuesEl.title = `${scanErrors} scan error${scanErrors === 1 ? '' : 's'} excluded from accessibility totals`;
        } else {
            issuesEl.removeAttribute('title');
        }
    }
    if (urlIssuesEl) urlIssuesEl.textContent = formatCompactNumber(urlsWithIssues);
    if (densityEl) densityEl.textContent = formatDensity(totalIssues, pages);
    if (highEl) highEl.textContent = formatCompactNumber(severity.high || 0);
    if (mediumEl) mediumEl.textContent = formatCompactNumber(severity.medium || 0);
    if (dateEl) dateEl.textContent = date;
    if (agentCountEl) agentCountEl.textContent = `${agents.length}`;
    if (agentsEl) agentsEl.textContent = agents.length > 0 ? agents.map(getAgentTitle).join(', ') : '--';
    if (focusEl) focusEl.textContent = focus;
}

function renderStatsCard() {
    const totalUrls = state.scopes.reduce((sum, scope) => sum + (scope.urlCount || 0), 0);
    const totalScopes = state.scopes.length;
    animateValue('dashboard-urls-count', 0, totalUrls, 700);

    const scopesEl = document.getElementById('dashboard-scopes-count');
    if (scopesEl) {
        scopesEl.textContent = `${totalScopes} monitored scope${totalScopes === 1 ? '' : 's'}`;
    }
}

function renderScanState() {
    const banner = document.getElementById('active-scan-banner');
    const title = document.getElementById('active-scan-title');
    const detail = document.getElementById('active-scan-detail');
    const progress = document.getElementById('active-scan-progress');
    const progressText = document.getElementById('active-scan-progress-text');
    const button = document.getElementById('active-scan-action');

    if (!banner) return;

    if (!state.isAuditing) {
        banner.classList.add('hidden');
        return;
    }

    const fileLabel = state.activeAuditFile
        ? state.activeAuditFile.replace('.json', '').replace(/_/g, ' ')
        : 'current scope';

    banner.classList.remove('hidden');
    if (title) title.textContent = `Scan in progress for ${fileLabel}`;
    if (detail) detail.textContent = state.scanProgressText || 'The crawler is running and collecting live results.';
    if (progress) progress.style.width = `${state.scanProgress || 0}%`;
    if (progressText) progressText.textContent = `${(state.scanProgress || 0).toFixed(0)}% complete`;
    if (button) {
        button.textContent = 'Watch live progress';
        button.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

export async function init() {
    renderStatsCard();
    renderLatestRun(state.reports[0] || null);
    renderRecentScans();
    renderScanState();
    window.refreshDashboardScanState = renderScanState;
    window.refreshDashboardView = refresh;
}

export function refresh() {
    renderStatsCard();
    renderLatestRun(state.reports[0] || null);
    renderRecentScans();
    renderScanState();
}
