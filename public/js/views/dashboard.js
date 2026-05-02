import { state } from '../modules/state.js';
import { api } from '../modules/api.js';

let complianceChart;
let issuesChart;

export async function init() {
    console.log('Initializing Dashboard...');
    initCharts();
    await updateStats();
    renderRecentScans();
}

function initCharts() {
    const complianceCtx = document.getElementById('complianceLineChart')?.getContext('2d');
    if (complianceCtx) {
        complianceChart = new Chart(complianceCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Compliance %',
                    data: [],
                    borderColor: '#8C1D40',
                    backgroundColor: 'rgba(140, 29, 64, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const issuesCtx = document.getElementById('issuesDoughnutChart')?.getContext('2d');
    if (issuesCtx) {
        issuesChart = new Chart(issuesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Alt Text', 'Links', 'WCAG', 'Quality'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#8C1D40', '#A52B4D', '#FFC627', '#1F2937']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
        });
    }
}

async function updateStats() {
    // Group reports by scope to get "Latest State"
    const latestReportsByScope = {};
    state.reports.forEach(r => {
        // Extract scope name from report name (e.g., "CORE-REPORT-..." -> "CORE")
        const scopeKey = r.name.split('-')[0];
        if (!latestReportsByScope[scopeKey]) {
            latestReportsByScope[scopeKey] = r;
        }
    });
    const latestReports = Object.values(latestReportsByScope);

    // 1. URLs Monitored (Breadth) - Total URLs across all scopes
    const totalScopeUrls = state.scopes.reduce((sum, s) => sum + (s.urlCount || 0), 0);
    const urlsEl = document.getElementById('kpi-total-urls');
    if (urlsEl) urlsEl.textContent = totalScopeUrls.toLocaleString();

    // 2. Pages Audited (Volume) - Cumulative total pages scanned
    const totalPages = state.reports.reduce((sum, r) => sum + (r.meta?.totalPages || 0), 0);
    const pagesEl = document.getElementById('kpi-total-pages');
    if (pagesEl) pagesEl.textContent = totalPages.toLocaleString();

    // 3. Current Issues Found (Impact) - Sum of issues in LATEST scans
    const currentIssues = latestReports.reduce((sum, r) => sum + (r.missingAlt || 0), 0);
    const issuesEl = document.getElementById('kpi-total-issues');
    if (issuesEl) issuesEl.textContent = currentIssues.toLocaleString();

    // 4. Avg Compliance (Health) - Average of LATEST scans
    const avgCompliance = latestReports.length > 0 
        ? latestReports.reduce((sum, r) => sum + r.compliance, 0) / latestReports.length 
        : 100;
    const complianceEl = document.getElementById('kpi-avg-compliance');
    if (complianceEl) complianceEl.textContent = `${avgCompliance.toFixed(1)}%`;
    
    // Update Latest Session Stats
    if (state.reports.length > 0) {
        const latest = state.reports[0];
        const latestContainer = document.getElementById('latest-session-stats');
        if (latestContainer) {
            latestContainer.classList.remove('hidden');
            document.getElementById('session-name').textContent = latest.name;
            document.getElementById('session-sites').textContent = latest.meta?.totalPages || 0;
            document.getElementById('session-images').textContent = latest.totalImages || 0;
            document.getElementById('session-affected-urls').textContent = latest.meta?.urlsWithIssues || 0;
        }
    }

    // Aggregate issue types for doughnut chart (from latest reports)
    const typeCounts = {};
    latestReports.forEach(r => {
        if (r.meta && r.meta.types) {
            Object.entries(r.meta.types).forEach(([type, count]) => {
                typeCounts[type] = (typeCounts[type] || 0) + count;
            });
        }
    });

    if (Object.keys(typeCounts).length > 0 && issuesChart) {
        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
        
        issuesChart.data.labels = sortedTypes.map(t => {
            const subType = t[0];
            const rules = state.wcagMap[subType] || [];
            const primary = rules[0];
            if (primary) {
                return `${subType} (${primary.criterion}) [${primary.version || '2.1'}]`;
            }
            return subType;
        });
        
        issuesChart.data.datasets[0].data = sortedTypes.map(t => t[1]);
        issuesChart.update();

        // Update "Most Common" label
        const commonLabel = document.querySelector('.common-label');
        if (commonLabel) commonLabel.textContent = sortedTypes[0][0];
        
        const barFill = document.getElementById('doughnut-bar-fill');
        if (barFill && currentIssues > 0) {
            const percentage = (sortedTypes[0][1] / currentIssues) * 100;
            barFill.style.width = `${percentage}%`;
        }
    }

    // Update Line Chart (Historical) - Show progression of all scans
    if (state.reports.length > 0 && complianceChart) {
        const history = state.reports.slice(0, 10).reverse();
        complianceChart.data.labels = history.map(r => new Date(r.timestamp).toLocaleDateString());
        complianceChart.data.datasets[0].data = history.map(r => r.compliance);
        complianceChart.update();
    }
}

function renderRecentScans() {
    const tbody = document.getElementById('recent-scans-tbody');
    if (!tbody) return;

    tbody.innerHTML = state.reports.slice(0, 5).map(report => `
        <tr>
            <td style="font-weight: 600;">${report.name.toLowerCase()}</td>
            <td>${report.meta?.totalPages || '--'}</td>
            <td><span style="color: ${report.missingAlt > 0 ? 'var(--danger)' : 'var(--success)'}">${report.missingAlt}</span></td>
            <td><span class="status-badge completed">completed</span></td>
            <td>${new Date(report.timestamp).toLocaleDateString()}</td>
            <td>
                <div class="action-group">
                    <a href="/reports/${report.file}" download="${report.file}" class="action-btn" title="Download CSV">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                    <a href="/reports/${report.file.replace('.csv', '.pdf')}" download="${report.file.replace('.csv', '.pdf')}" class="action-btn pdf" title="Download PDF">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    </a>
                    ${report.meta && report.meta.codaUrl ? `
                        <a href="${report.meta.codaUrl}" target="_blank" class="action-btn coda" title="View in Coda">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </a>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}
