const socket = io();

// State
let scopes = [];
let agents = [];
let reports = [];
let isAuditing = false;
let activeAuditFile = null;
let currentView = 'dashboard';
let wizardStep = 1;
let selectedScope = null;
let selectedAudits = [];
let scopeViewMode = 'grid'; // Default view mode for Scopes
let shouldSelectAllAgents = false;
let agentSearchQuery = '';
let agentCategoryFilter = 'all';

// DOM Elements
const viewDashboard = document.getElementById('view-dashboard');
const viewScopes = document.getElementById('view-scopes');
const viewAgents = document.getElementById('view-agents');
const viewReports = document.getElementById('view-reports');
const viewSettings = document.getElementById('view-settings');
const viewFaq = document.getElementById('view-faq');
const menuItems = document.querySelectorAll('.menu-item');
const recentScansTbody = document.getElementById('recent-scans-tbody');
const scopesList = document.getElementById('scopes-list');
const agentsList = document.getElementById('agents-list');
const auditReportsTbody = document.getElementById('audit-reports-tbody');
const globalProgressBar = document.getElementById('global-progress-bar');
const auditOverlay = document.getElementById('active-audit-overlay');
const overlayProgressBar = document.getElementById('overlay-progress-bar');
const overlayScopeName = document.getElementById('overlay-agent-name'); // Kept ID
const wizardModal = document.getElementById('scan-wizard-modal');
const wizardScopesList = document.getElementById('wizard-scopes-list');
const wizardAgentsList = document.getElementById('wizard-agents-list');
const summaryScope = document.getElementById('summary-scope');
const summaryAgents = document.getElementById('summary-agents');
const wizardNextBtn = document.getElementById('wizard-next');
const wizardPrevBtn = document.getElementById('wizard-prev');
const wizardRunBtn = document.getElementById('wizard-run');

// Charts Instances
let complianceChart;
let issuesChart;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    setupNavigation();
    setupWizardListeners();
    loadInitialData();
});

function setupWizardListeners() {
    // Connect "Start New Scan" buttons to wizard
    document.querySelectorAll('.primary-btn').forEach(btn => {
        if (btn.textContent.includes('Start New Scan') || btn.textContent.includes('Deploy Fleet')) {
            btn.onclick = (e) => {
                e.preventDefault();
                openWizard();
            };
        }
    });
}

// Navigation
function setupNavigation() {
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });
}

function switchView(viewName) {
    currentView = viewName;
    
    // Update menu UI
    menuItems.forEach(item => {
        if (item.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update visibility
    viewDashboard.classList.toggle('active', viewName === 'dashboard');
    viewScopes.classList.toggle('active', viewName === 'scopes');
    viewAgents.classList.toggle('active', viewName === 'agents');
    viewReports.classList.toggle('active', viewName === 'reports');
    viewSettings.classList.toggle('active', viewName === 'settings');
    viewFaq.classList.toggle('active', viewName === 'faq');

    if (viewName === 'dashboard') {
        renderMockRecentScans();
        // Force chart update
        if (complianceChart) complianceChart.update();
        if (issuesChart) issuesChart.update();
    } else if (viewName === 'scopes') {
        renderScopes();
    } else if (viewName === 'agents') {
        agentSearchQuery = '';
        agentCategoryFilter = 'all';
        renderAgents();
    } else if (viewName === 'reports') {
        renderReports();
    } else if (viewName === 'settings') {
        loadSettings();
    } else if (viewName === 'faq') {
        initFaqAccordion();
    }
}

function initFaqAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        header.onclick = () => {
            const isActive = item.classList.contains('active');
            accordionItems.forEach(i => i.classList.remove('active'));
            if (!isActive) item.classList.add('active');
        };
    });
}

// Socket Handlers
socket.on('connect', () => {
    console.log('Connected to server');
    loadInitialData();
});

    socket.on('auditStarted', (data) => {
        isAuditing = true;
        activeAuditFile = data.file;
        auditOverlay.classList.remove('hidden');
        overlayScopeName.textContent = `Scanning Scope: ${data.file.replace('.json', '').toUpperCase()}...`;
        
        // Reset live stats
        const pagesCountEl = document.getElementById('overlay-pages-count');
        const issuesCountEl = document.getElementById('overlay-issues-count');
        if (pagesCountEl) pagesCountEl.textContent = '0';
        if (issuesCountEl) issuesCountEl.textContent = '0';

        updateProgress(0);
        updateUIForAuditingState();
    });

socket.on('progress', (data) => {
    const percent = (data.processed / data.total) * 100;
    updateProgress(percent);
    overlayScopeName.textContent = `Scanning Scope: ${activeAuditFile.replace('.json', '').toUpperCase()}`;
    
    // Update live stats in overlay
    const pagesCountEl = document.getElementById('overlay-pages-count');
    const issuesCountEl = document.getElementById('overlay-issues-count');
    
    if (pagesCountEl) pagesCountEl.textContent = data.processed;
    if (issuesCountEl) issuesCountEl.textContent = data.issueCount || 0;
});

let sessionSeverityChart;

socket.on('auditComplete', (data) => {
    isAuditing = false;
    activeAuditFile = null;
    updateProgress(100);
    updateUIForAuditingState();
    
    // Update Session Stats if available
    if (data.stats) {
        updateSessionStats(data.stats);
    }
    
    setTimeout(() => {
        auditOverlay.classList.add('hidden');
        loadInitialData();
        if (currentView === 'reports') renderReports();
        if (currentView === 'dashboard') renderRecentScans();
    }, 3000);
});

function updateSessionStats(stats) {
    const container = document.getElementById('latest-session-stats');
    if (!container) return;
    
    container.classList.remove('hidden');
    
    const kpiRow = container.querySelector('.mini-kpi-row');
    if (kpiRow) {
        // Keep the first 3 (Sites, Images, Affected URLs)
        const baseKpis = Array.from(kpiRow.querySelectorAll('.mini-kpi')).slice(0, 3);
        kpiRow.innerHTML = '';
        baseKpis.forEach(kpi => kpiRow.appendChild(kpi));

        // Map internal types to display names
        const typeLabels = {
            'alt-presence': 'Alt Presence',
            'alt-quality': 'Alt Quality',
            'broken-link': 'Broken Links',
            'heading-structure': 'Headings',
            'form-accessibility': 'Forms',
            'form-error': 'Form Errors',
            'documentation': 'Docs'
        };

        // Add dynamic KPIs for each issue type found
        if (stats.types) {
            Object.entries(stats.types).forEach(([type, count]) => {
                if (count > 0) {
                    const label = typeLabels[type] || type.replace(/-/g, ' ').toUpperCase();
                    const div = document.createElement('div');
                    div.className = 'mini-kpi';
                    div.innerHTML = `
                        <span class="label">${label}</span>
                        <span class="value">${count}</span>
                    `;
                    kpiRow.appendChild(div);
                }
            });
        }
    }

    document.getElementById('session-name').textContent = stats.name || 'Latest Run';
    document.getElementById('session-sites').textContent = stats.totalPages;
    document.getElementById('session-images').textContent = stats.totalImages;
    document.getElementById('session-affected-urls').textContent = stats.urlsWithIssues;
    
    // Update or Create Session Severity Chart
    const ctx = document.getElementById('sessionSeverityChart');
    if (!ctx) return;

    if (!sessionSeverityChart) {
        sessionSeverityChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['High', 'Medium', 'Low'],
                datasets: [{
                    data: [stats.severity.high, stats.severity.medium, stats.severity.low],
                    backgroundColor: ['#EF4444', '#F59E0B', '#22C55E'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });
    } else {
        sessionSeverityChart.data.datasets[0].data = [stats.severity.high, stats.severity.medium, stats.severity.low];
        sessionSeverityChart.update();
    }
}

socket.on('auditError', (data) => {
    isAuditing = false;
    activeAuditFile = null;
    updateUIForAuditingState();
    auditOverlay.classList.add('hidden');
    alert(`Scan Failed: ${data.error}`);
});

function updateUIForAuditingState() {
    // 1. Update Mini Status in Sidebar
    const miniStatus = document.getElementById('mini-status');
    if (miniStatus) {
        miniStatus.textContent = isAuditing ? 'Scan in Progress...' : 'System Idle';
        miniStatus.style.color = isAuditing ? 'var(--primary)' : 'var(--text-dim)';
    }

    // 2. Update Global CTA Buttons
    document.querySelectorAll('.primary-btn, .run-btn').forEach(btn => {
        const isScopeBtn = btn.hasAttribute('data-scope-file');
        const scopeFile = btn.getAttribute('data-scope-file');
        const isRunBtn = btn.classList.contains('run-btn');
        
        if (isAuditing) {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.style.cursor = 'not-allowed';
            
            // Only show spinner on the button that matches the active file
            if (isScopeBtn && scopeFile === activeAuditFile) {
                btn.innerHTML = `<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right: 8px; animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Scanning...`;
            } else {
                // For all other buttons (other scopes or global ones), just show regular text but disabled
                if (isRunBtn) {
                     btn.innerHTML = `
                        <div class="play-icon-circle">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                        <span>${isScopeBtn ? 'Run Scan' : 'Start New Scan'}</span>
                    `;
                } else {
                    if (btn.textContent.includes('Scanning...')) {
                        btn.textContent = isScopeBtn ? 'Run Scan' : 'Start New Scan';
                    }
                }
            }
        } else {
            // Restore original state
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            
            if (isRunBtn) {
                btn.innerHTML = `
                    <div class="play-icon-circle">
                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <span>${isScopeBtn ? 'Run Scan' : 'Start New Scan'}</span>
                `;
            } else if (btn.textContent.includes('Scanning...')) {
                btn.textContent = isScopeBtn ? 'Run Scan' : 'Start New Scan';
            }
        }
    });

    // 3. Update Wizard Run Button
    if (wizardRunBtn) {
        if (isAuditing) {
            wizardRunBtn.disabled = true;
            wizardRunBtn.innerHTML = `<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right: 8px; animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Scanning...`;
        } else {
            wizardRunBtn.disabled = false;
            wizardRunBtn.innerHTML = `
                <div class="play-icon-circle">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <span>Start Scan</span>
            `;
        }
    }
}

function updateProgress(percent) {
    globalProgressBar.style.width = `${percent}%`;
    overlayProgressBar.style.width = `${percent}%`;
}

// Charts
function initCharts() {
    const complianceCtx = document.getElementById('complianceLineChart').getContext('2d');
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
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 60, max: 100, ticks: { stepSize: 10 } },
                x: { grid: { display: false } }
            }
        }
    });

    const issuesCtx = document.getElementById('issuesDoughnutChart').getContext('2d');
    issuesChart = new Chart(issuesCtx, {
        type: 'doughnut',
        data: {
            labels: ['Alt Text', 'Links', 'WCAG', 'Quality'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#8C1D40', '#A52B4D', '#FFC627', '#1F2937'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { weight: '600' }
                    }
                }
            }
        }
    });
}

// Data Loading
async function loadInitialData() {
    try {
        const [scopesRes, agentsRes, reportsRes] = await Promise.all([
            fetch('/api/scopes'),
            fetch('/api/agents'),
            fetch('/api/reports')
        ]);
        scopes = await scopesRes.json();
        agents = await agentsRes.json();
        reports = await reportsRes.json();
        
        updateDashboardStats();
        
        if (currentView === 'scopes') renderScopes();
        if (currentView === 'agents') renderAgents();
        if (currentView === 'reports') renderReports();
        if (currentView === 'dashboard') renderRecentScans();
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

function updateDashboardStats() {
    // 1. Total Scopes URL Count (Total reach)
    const totalScopeUrls = scopes.reduce((sum, s) => sum + (s.urlCount || 0), 0);
    document.getElementById('kpi-total-sites').textContent = totalScopeUrls.toLocaleString();

    // 2. Aggregate from Reports
    const totalImages = reports.reduce((sum, r) => sum + (r.totalImages || 0), 0);
    const totalMissingAlt = reports.reduce((sum, r) => sum + (r.missingAlt || 0), 0);
    const avgCompliance = reports.length > 0 
        ? (reports.reduce((sum, r) => sum + (r.compliance || 0), 0) / reports.length)
        : null;

    document.getElementById('kpi-total-images').textContent = totalImages.toLocaleString();
    document.getElementById('kpi-total-issues').textContent = totalMissingAlt.toLocaleString();
    document.getElementById('kpi-compliance-rate').textContent = avgCompliance !== null ? `${avgCompliance.toFixed(1)}%` : '--%';

    // Reports View Stats
    // Metrics cards removed from UI

    // Update pagination footer
    const footerCount = document.getElementById('report-count-footer');
    const footerTotal = document.getElementById('report-total-footer');
    if (footerCount) footerCount.textContent = reports.length;
    if (footerTotal) footerTotal.textContent = reports.length;

    updateCharts();
}

function updateCharts() {
    if (!complianceChart || !issuesChart) return;
    
    if (reports.length > 0) {
        // Line chart shows compliance over time
        complianceChart.data.labels = reports.slice(0, 7).map(r => r.name.split(' ')[0]).reverse();
        complianceChart.data.datasets[0].data = reports.slice(0, 7).map(r => r.compliance).reverse();
        
        // Doughnut shows issues breakdown from the LATEST report
        const latest = reports[0];
        if (latest.meta && latest.meta.types) {
            const types = latest.meta.types;
            const labels = Object.keys(types).map(t => {
                const map = {
                    'alt-presence': 'Alt Presence',
                    'alt-quality': 'Alt Quality',
                    'broken-link': 'Links',
                    'heading-structure': 'Headings',
                    'form-accessibility': 'Forms',
                    'form-error': 'Form Errors'
                };
                return map[t] || t.toUpperCase();
            });
            const data = Object.values(types);
            
            issuesChart.data.labels = labels;
            issuesChart.data.datasets[0].data = data;
            
            // Update most common
            let maxType = '';
            let maxCount = -1;
            Object.entries(types).forEach(([t, c]) => {
                if (c > maxCount) {
                    maxCount = c;
                    maxType = t;
                }
            });

            const commonLabel = document.querySelector('.common-label');
            if (commonLabel) {
                const map = {
                    'alt-presence': 'Alt Presence',
                    'alt-quality': 'Alt Quality',
                    'broken-link': 'Broken Links',
                    'heading-structure': 'Heading Issues',
                    'form-accessibility': 'Form Labels',
                    'form-error': 'Form Errors'
                };
                commonLabel.textContent = map[maxType] || maxType.toUpperCase();
                
                const barFill = document.getElementById('doughnut-bar-fill');
                if (barFill && latest.missingAlt > 0) {
                    barFill.style.width = `${(maxCount / latest.missingAlt) * 100}%`;
                }
            }
        } else {
             issuesChart.data.datasets[0].data = [latest.missingAlt || 0, 0, 0, 0];
        }
    }
    
    complianceChart.update();
    issuesChart.update();
}

function renderRecentScans() {
    recentScansTbody.innerHTML = reports.slice(0, 5).map(report => {
        let status = 'completed';
        let statusClass = 'completed';
        if (report.compliance < 70) {
            status = 'partial';
            statusClass = 'in-progress';
        }
        if (report.compliance < 30 || (report.meta && report.meta.error)) {
            status = 'failed';
            statusClass = 'failed';
        }

        return `
            <tr>
                <td style="font-weight: 600;">${report.name.toLowerCase()}</td>
                <td>${report.totalImages || '--'}</td>
                <td>
                    <span style="color: ${report.missingAlt > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">
                        ${report.missingAlt > 0 ? report.missingAlt : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>None'}
                    </span>
                </td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td style="color: var(--text-dim); font-size: 0.8rem;">${new Date(report.timestamp).toLocaleDateString()}</td>
            </tr>
        `;
    }).join('');

    if (reports.length === 0) {
        recentScansTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-dim);">No scans recorded yet. Deploy a scope to start.</td></tr>';
    }
}

function renderScopes() {
    if (scopeViewMode === 'grid') {
        renderScopesGrid();
    } else {
        renderScopesList();
    }
}

function setScopeView(mode) {
    scopeViewMode = mode;
    
    // Update Switcher Buttons
    document.querySelectorAll('.switcher-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-view-mode') === mode);
    });

    // Update View Containers
    document.getElementById('scopes-list').classList.toggle('hidden', mode !== 'grid');
    document.getElementById('scopes-list-view').classList.toggle('hidden', mode !== 'list');

    renderScopes();
}

function formatLastScan(date) {
    if (!date || date === 'Never') return 'Never';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Never'; // Handle invalid date strings
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
           ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function renderScopesGrid() {
    scopesList.innerHTML = scopes.map((scope, i) => `
        <div class="scope-card">
            <div class="scope-card-header">
                <div class="scope-info">
                    <h3>${scope.name}</h3>
                    <span class="url-count">${scope.urlCount || 0} URLs</span>
                </div>
                <div class="last-scan">Last Scan: <br> ${formatLastScan(scope.lastScan)}</div>
            </div>
            
            <div class="scope-actions">
                <button class="secondary-btn" onclick="alert('Edit scope: ${scope.file}')">Edit</button>
                <button class="run-btn" data-scope-file="${scope.file}" onclick="startAudit('${scope.file}')">
                    <div class="play-icon-circle">
                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <span>Run Scan</span>
                </button>
            </div>
        </div>
    `).join('');

    if (scopes.length === 0) {
        scopesList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-dim);">No scopes found. Import a sitemap to get started.</div>';
    }
    updateUIForAuditingState();
}

function renderScopesList() {
    const tbody = document.getElementById('scopes-list-tbody');
    tbody.innerHTML = scopes.map(scope => `
        <tr>
            <td style="font-weight: 700;">${scope.name}</td>
            <td><span class="url-count">${scope.urlCount || 0} URLs</span></td>
            <td style="color: var(--text-dim); font-size: 0.85rem;">${formatLastScan(scope.lastScan)}</td>
            <td>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="secondary-btn" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="alert('Edit scope: ${scope.file}')">Edit</button>
                    <button class="run-btn" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" data-scope-file="${scope.file}" onclick="startAudit('${scope.file}')">
                        <div class="play-icon-circle" style="width: 20px; height: 20px;">
                            <svg viewBox="0 0 24 24" style="width: 10px; height: 10px;"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                        <span>Run Scan</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    if (scopes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 3rem; color: var(--text-dim);">No scopes found.</td></tr>';
    }
    updateUIForAuditingState();
}

function handleAgentSearch(query) {
    agentSearchQuery = query.toLowerCase();
    renderAgents();
}

function filterAgentsByCategory(category) {
    agentCategoryFilter = category;
    
    // Update UI chips
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        const chipCat = chip.getAttribute('onclick').match(/'([^']+)'/)[1];
        chip.classList.toggle('active', chipCat === category);
    });
    
    renderAgents();
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderAgents() {
    const auditInfo = {
        "altTextAgent": {
            "title": "Alt Text Presence",
            "category": "detection",
            "subtitle": "Detection Agent",
            "skills": ["Deep Crawling", "DOM Inspection"],
            "wcag": ["1.1.1"],
            "description": "Identifies missing or empty alt attributes and common placeholder alt text on images, with role-based guidance for WCAG 1.1.1."
        },
        "altQualityAgent": {
            "title": "Alt Text Quality",
            "category": "analysis",
            "subtitle": "Analysis Agent",
            "skills": ["Contextual Analysis", "AI Heuristics"],
            "wcag": ["1.1.1"],
            "description": "Evaluates existing alt text for redundant phrasing, generic wording, filename-like text, and length issues using lightweight contextual heuristics."
        },
        "contrastAgent": {
            "title": "Color Contrast",
            "category": "analysis",
            "subtitle": "Visual Agent",
            "skills": ["Color Sampling", "Luminance Calc"],
            "wcag": ["1.4.3", "1.4.11"],
            "description": "Checks text color contrast using inline and inherited style heuristics, including sampled visible text and large-text thresholds."
        },
        "formAccessibilityAgent": {
            "title": "Form Structure",
            "category": "validation",
            "subtitle": "Audit Agent",
            "skills": ["Label Matching", "Field Grouping"],
            "wcag": ["1.3.1", "3.3.2", "4.1.2"],
            "description": "Checks form controls for accessible labels and names, required-field indicators, button names, and grouped radio or checkbox sets."
        },
        "formErrorAgent": {
            "title": "Form Validation",
            "category": "validation",
            "subtitle": "Audit Agent",
            "skills": ["Error Detection", "ARIA-Alerts"],
            "wcag": ["3.3.1", "3.3.3"],
            "description": "Checks validation states for missing or unlinked error messages, missing aria-invalid, and basic form-level error summaries."
        },
        "ariaAgent": {
            "title": "ARIA Validation",
            "category": "validation",
            "subtitle": "Audit Agent",
            "skills": ["Spec Validation", "Role Mapping"],
            "wcag": ["4.1.2"],
            "description": "Checks ARIA roles for validity, redundant native-role overrides, missing required states or properties, and aria-hidden misuse on focusable elements."
        },
        "headingStructureAgent": {
            "title": "Heading Hierarchy",
            "category": "structure",
            "subtitle": "Audit Agent",
            "skills": ["Outline Analysis", "Logical Flow"],
            "wcag": ["1.3.1", "2.4.1"],
            "description": "Checks for missing or multiple H1 headings and skipped heading levels in the visible document outline."
        },
        "landmarkAgent": {
            "title": "Semantic Landmarks",
            "category": "structure",
            "subtitle": "Audit Agent",
            "skills": ["Region Mapping", "Role Detection"],
            "wcag": ["1.3.1", "2.4.1"],
            "description": "Checks for core landmarks like <main>, <nav>, <header>, and <footer>, including missing or duplicate landmark usage that affects screen reader navigation."
        },
        "linkAgent": {
            "title": "Link Integrity",
            "category": "navigation",
            "subtitle": "Audit Agent",
            "skills": ["Link Validation", "Status Check"],
            "wcag": ["2.4.4"],
            "description": "Checks links for missing hrefs, javascript:void patterns, intentional control anchors, and broken or access-restricted destinations using HEAD with GET fallback where possible."
        },
        "linkTextAgent": {
            "title": "Link Clarity",
            "category": "navigation",
            "subtitle": "Audit Agent",
            "skills": ["Text Analysis", "Ambiguity Check"],
            "wcag": ["2.4.4", "2.4.9"],
            "description": "Checks links for empty text, generic link text, and duplicate link text that points to different destinations."
        },
        "navigationAgent": {
            "title": "Focusable Element Flow Map",
            "category": "navigation",
            "subtitle": "Heuristic Mapping Agent",
            "skills": ["Tab Order Mapping", "ARIA Name Reporting"],
            "wcag": ["1.3.1", "2.4.3"],
            "description": "Lists focusable elements in DOM order with their semantic role and accessible name. This is a flow inventory, not a computed browser tab-order or interaction-state audit."
        },
        "keyboardAgent": {
            "title": "Keyboard Access",
            "category": "interaction",
            "subtitle": "Audit Agent",
            "skills": ["Event Simulation", "Trap Detection"],
            "wcag": ["2.1.1", "2.1.2"],
            "description": "Flags onclick-only elements lacking keyboard access, positive tabindex values, and heuristic keyboard-trap patterns."
        },
        "focusAgent": {
            "title": "Focus Visibility & Order",
            "category": "interaction",
            "subtitle": "Heuristic Agent",
            "skills": ["Focus Outline Checks", "Tab Order Heuristics"],
            "wcag": ["2.4.7"],
            "description": "Heuristically flags inline outline suppression and positive tabindex values. It does not inspect computed styles, focus traps, or dynamic focus restoration."
        },
        "targetSizeAgent": {
            "title": "Touch Target Heuristics",
            "category": "interaction",
            "subtitle": "Heuristic Agent",
            "skills": ["Inline Geometry", "Icon-Only Detection"],
            "wcag": ["2.5.5", "2.5.8"],
            "description": "Flags clickable elements with inline width/height below 24px and icon-only controls that may be too small. It does not measure rendered layout or spacing between targets."
        },
        "wcagAgent": {
            "title": "Legacy WCAG Stub",
            "category": "legacy",
            "subtitle": "Compatibility Placeholder",
            "skills": [],
            "wcag": ["Level A", "Level AA"],
            "description": "Compatibility-only legacy module. It is intentionally disabled and returns no issues."
        }
    };

    const mockStats = {
        "altQualityAgent": { sites: 12, images: 450, issues: 2, coverage: 94 },
        "altTextAgent": { sites: 12, images: 450, issues: 15, coverage: 100 },
        "contrastAgent": { sites: 8, images: 0, issues: 24, coverage: 88 },
        "formAccessibilityAgent": { sites: 8, images: 0, issues: 5, coverage: 92 },
        "formErrorAgent": { sites: 8, images: 0, issues: 1, coverage: 95 },
        "headingStructureAgent": { sites: 15, images: 0, issues: 0, coverage: 100 },
        "linkAgent": { sites: 20, images: 0, issues: 12, coverage: 98 },
        "navigationAgent": { sites: 10, images: 0, issues: 3, coverage: 90 },
        "wcagAgent": { sites: 5, images: 0, issues: 0, coverage: 85 }
    };

    // Filter agents
    const filteredAgents = agents.filter(agent => {
        const info = auditInfo[agent.name] || {};
        const matchesSearch = !agentSearchQuery || 
            (info.title && info.title.toLowerCase().includes(agentSearchQuery)) ||
            (info.description && info.description.toLowerCase().includes(agentSearchQuery)) ||
            (info.skills && info.skills.some(s => s.toLowerCase().includes(agentSearchQuery)));
            
        const matchesCategory = agentCategoryFilter === 'all' || info.category === agentCategoryFilter;
        
        return matchesSearch && matchesCategory;
    });

    // Update Fleet Stats if they exist in DOM
    const activeCount = agents.filter(a => a.enabled).length;
    const totalCount = agents.length;
    const activeAgentsEl = document.getElementById('stat-active-agents');
    const totalAgentsEl = document.getElementById('stat-total-agents');
    const fleetHealthEl = document.getElementById('stat-fleet-health');
    
    if (activeAgentsEl) activeAgentsEl.textContent = activeCount;
    if (totalAgentsEl) totalAgentsEl.textContent = totalCount;
    if (fleetHealthEl) {
        const health = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
        fleetHealthEl.textContent = `${health}%`;
    }

    if (filteredAgents.length === 0) {
        agentsList.innerHTML = `
            <div class="no-results">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <h3>No agents found</h3>
                <p>Try adjusting your search or category filter.</p>
            </div>
        `;
        return;
    }

    const categories = [
        { id: 'detection', name: 'Detection', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
        { id: 'analysis', name: 'Analysis', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>' },
        { id: 'validation', name: 'Validation', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
        { id: 'structure', name: 'Structure', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' },
        { id: 'interaction', name: 'Interaction', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4l7 16 2.2-6.4L20 11 4 4z"></path><path d="M14 14l4 4"></path></svg>' },
        { id: 'navigation', name: 'Navigation', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>' },
        { id: 'legacy', name: 'Legacy', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 8V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><rect x="1" y="3" width="22" height="5" rx="2"/><line x1="10" y1="12" x2="14" y2="12"/></svg>' }
    ];

    let html = '';

    if (agentCategoryFilter === 'all' && !agentSearchQuery) {
        categories.forEach(cat => {
            const catAgents = filteredAgents.filter(a => (auditInfo[a.name] || {}).category === cat.id);
            if (catAgents.length > 0) {
                html += `
                    <div class="category-group" data-category="${cat.id}">
                        <div class="category-header">
                            <div class="cat-icon-wrap">${cat.icon}</div>
                            <span class="category-title">${cat.name}</span>
                            <span class="category-count">${catAgents.length} Agents</span>
                        </div>
                        <div class="audits-list-grid">
                            ${catAgents.map(agent => renderAgentCard(agent, auditInfo, mockStats)).join('')}
                        </div>
                    </div>
                `;
            }
        });
    } else {
        html = `
            <div class="audits-list-grid">
                ${filteredAgents.map(agent => renderAgentCard(agent, auditInfo, mockStats)).join('')}
            </div>
        `;
    }

    agentsList.innerHTML = html;
    updateUIForAuditingState();
}

function renderAgentCard(agent, auditInfo, mockStats) {
    const info = auditInfo[agent.name] || { 
        title: agent.name.toUpperCase(), 
        category: 'legacy',
        subtitle: 'Specialized Agent', 
        skills: ['Audit'], 
        wcag: [],
        description: 'Specialized accessibility audit agent.' 
    };
    const stats = mockStats[agent.name] || { sites: 0, images: 0, issues: 0, coverage: 0 };
    const status = agent.enabled ? 'ACTIVE' : (stats.sites > 0 ? 'IDLE' : 'OFFLINE');
    const statusClass = status.toLowerCase();
    const safeTitle = escapeHTML(info.title);
    const safeDescription = escapeHTML(info.description);
    const safeSkills = (info.skills || []).map(skill => escapeHTML(skill));
    const safeCategory = escapeHTML(info.category);
    const safeWcag = (info.wcag || []).map(w => escapeHTML(w));

    return `
        <div class="audit-card ${status === 'ACTIVE' ? 'is-active' : ''}" data-category="${safeCategory}">
            <div class="agent-card-header">
                <div class="agent-icon-box ${statusClass}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                    <span class="agent-status-dot ${statusClass}"></span>
                </div>
                <div class="agent-title-group">
                    <div class="agent-cat-label">${safeCategory.toUpperCase()}</div>
                    <h3>${safeTitle}</h3>
                </div>
                <div class="agent-toggle-wrapper">
                    <label class="switch">
                        <input type="checkbox" ${agent.enabled ? 'checked' : ''} onchange="toggleAgent('${agent.name}', this.checked)">
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>

            <div class="agent-description">
                ${safeDescription}
            </div>

            <div class="agent-skills-row">
                ${safeSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>

            <div class="agent-metrics">
                <div class="metric">
                    <span class="m-label">Yield</span>
                    <span class="m-value ${stats.issues > 10 ? 'danger' : ''}">${stats.issues}</span>
                </div>
                <div class="metric">
                    <span class="m-label">Coverage</span>
                    <span class="m-value">${stats.coverage}%</span>
                </div>
                <div class="metric">
                    <span class="m-label">WCAG</span>
                    <div class="wcag-badges">
                        ${safeWcag.map(w => `<span class="wcag-badge">${w}</span>`).join('')}
                    </div>
                </div>
            </div>

            <div class="agent-footer">
                <div class="agent-status-indicator ${statusClass}">
                    <span class="pulse-dot"></span>
                    ${status}
                </div>
                <button class="configure-btn" onclick="alert('Configuration for ${info.title} coming soon')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
            </div>
        </div>
    `;
}

async function toggleAgent(name, enabled) {
    try {
        const res = await fetch('/api/agents/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, enabled })
        });
        if (res.ok) {
            loadInitialData();
        }
    } catch (err) {
        console.error('Error toggling agent:', err);
    }
}

async function stopAllAgents() {
    if (confirm('Are you sure you want to turn off the entire fleet?')) {
        try {
            const res = await fetch('/api/agents/toggle-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: false })
            });
            if (res.ok) {
                console.log('All agents turned off');
                loadInitialData();
            }
        } catch (err) {
            console.error('Error stopping fleet:', err);
        }
    }
}

function pauseAgent(name) {
    console.log(`Pausing agent: ${name}`);
    toggleAgent(name, false);
}

function stopAgent(name) {
    console.log(`Stopping agent: ${name}`);
    toggleAgent(name, false);
}

function renderReports() {
    auditReportsTbody.innerHTML = reports.map((report, i) => {
        const date = new Date(report.timestamp);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        // Determine status and colors
        let status = 'COMPLETED';
        let statusClass = 'completed';
        if (report.compliance < 70) {
            status = 'PARTIAL';
            statusClass = 'in-progress'; // Using warning color for partial
        }
        if (report.compliance < 30 || (report.meta && report.meta.error)) {
            status = 'FAILED';
            statusClass = 'failed';
        }

        const complianceColor = report.compliance > 80 ? 'var(--success)' : (report.compliance > 50 ? 'var(--warning)' : 'var(--danger)');

        return `
            <tr>
                <td style="font-weight: 700; color: var(--primary);">#RUN-${reports.length - i}</td>
                <td style="font-size: 0.8rem; color: var(--text-dim);">${dateStr} <br> ${timeStr}</td>
                <td style="font-weight: 600;">${report.name.toLowerCase()}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="height: 6px; width: 60px; background: #eee; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${report.compliance}%; background: ${complianceColor};"></div>
                        </div>
                        <span style="font-weight: 700; color: ${complianceColor}; font-size: 0.8rem;">${report.compliance}%</span>
                    </div>
                </td>
                <td>
                    <span style="color: ${report.missingAlt > 0 ? 'var(--danger)' : 'var(--text-dim)'}; font-size: 0.85rem; font-weight: ${report.missingAlt > 0 ? '600' : '400'};">
                        ${report.meta && report.meta.error ? report.meta.error : (report.missingAlt > 0 ? `${report.missingAlt} issues found` : 'No issues found')}
                    </span>
                </td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>
                    <div class="action-group">

                        <a href="/reports/${report.file}" download="${report.file}" class="action-btn" title="Download CSV">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </a>
                        ${report.meta && report.meta.codaUrl ? `
                            <a href="${report.meta.codaUrl}" target="_blank" class="action-btn coda" title="View in Coda">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </a>
                        ` : ''}
                        ${status === 'FAILED' ? `
                            <button onclick="startAudit('${report.file.split('-report')[0]}.json')" class="action-btn retry" title="Retry Scan">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (reports.length === 0) {
        auditReportsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-dim);">No reports generated yet.</td></tr>';
    }
}

function startAudit(file) {
    if (isAuditing) {
        alert('A scan is already in progress.');
        return;
    }
    activeAuditFile = file;
    isAuditing = true;
    updateUIForAuditingState();
    // Backward compatibility for the "Run Scan" button on scope cards
    socket.emit('startAudit', { file });
}

// Wizard Functions
function openWizard(selectAll = false) {
    shouldSelectAllAgents = selectAll;
    wizardStep = 1;
    selectedScope = null;
    selectedAgents = [];
    updateWizardUI();
    wizardModal.classList.remove('hidden');
    renderWizardScopes();
}

function closeWizard() {
    wizardModal.classList.add('hidden');
    shouldSelectAllAgents = false; // Reset flag when closing
}

async function deployFleet() {
    try {
        const res = await fetch('/api/agents/toggle-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true })
        });
        if (res.ok) {
            console.log('All agents deployed (Turned On)');
            loadInitialData();
        }
    } catch (err) {
        console.error('Error deploying fleet:', err);
    }
}

function updateWizardUI() {
    // Update steps indicator
    document.querySelectorAll('.wizard-steps-indicator .step').forEach(s => {
        const stepNum = parseInt(s.dataset.step);
        s.classList.toggle('active', stepNum === wizardStep);
    });

    // Update step visibility
    document.querySelectorAll('.wizard-step').forEach((s, i) => {
        s.classList.toggle('active', (i + 1) === wizardStep);
    });

    // Update buttons
    wizardPrevBtn.classList.toggle('hidden', wizardStep === 1);
    wizardNextBtn.classList.toggle('hidden', wizardStep === 3);
    wizardRunBtn.classList.toggle('hidden', wizardStep !== 3);
    
    if (wizardStep === 3) {
        summaryScope.textContent = selectedScope ? selectedScope.name : 'None';
        summaryAgents.textContent = selectedAgents.length > 0 ? selectedAgents.map(a => a.name).join(', ') : 'None';
    }
}

function nextStep() {
    if (wizardStep === 1) {
        const checked = wizardScopesList.querySelector('input[type="radio"]:checked');
        if (!checked) return alert('Please select a scope.');
        selectedScope = scopes.find(s => s.file === checked.value);
        renderWizardAgents();
    }
    if (wizardStep === 2) {
        const checked = Array.from(wizardAgentsList.querySelectorAll('input[type="checkbox"]:checked'));
        if (checked.length === 0) return alert('Please select at least one agent.');
        selectedAgents = checked.map(c => agents.find(a => a.name === c.value));
    }
    
    wizardStep++;
    updateWizardUI();
}

function prevStep() {
    wizardStep--;
    updateWizardUI();
}

function renderWizardScopes() {
    wizardScopesList.innerHTML = scopes.map(scope => `
        <label class="wizard-option">
            <input type="radio" name="wizard-scope" value="${scope.file}">
            <div class="option-info">
                <span class="option-name">${scope.name}</span>
                <span class="option-meta">${scope.urlCount} URLs</span>
            </div>
        </label>
    `).join('');
}

function renderWizardAgents() {
    wizardAgentsList.innerHTML = agents.map(agent => `
        <label class="wizard-option ${agent.enabled ? 'is-active' : ''}">
            <input type="checkbox" name="wizard-agent" value="${agent.name}" ${ (shouldSelectAllAgents || agent.enabled) ? 'checked' : ''}>
            <div class="option-info">
                <span class="option-name">${agent.name.replace('Agent', '').toUpperCase()}</span>
                <span class="option-meta">${agent.enabled ? 'Active' : 'Inactive'}</span>
            </div>
        </label>
    `).join('');
}

function runWizardScan() {
    if (isAuditing) return alert('A scan is already in progress.');
    
    const config = {
        file: selectedScope.file,
        agents: selectedAgents.map(a => a.name.replace('Agent', '')) // Normalize names for backend
    };
    
    activeAuditFile = selectedScope.file;
    isAuditing = true;
    updateUIForAuditingState();
    
    socket.emit('startAudit', config);
    closeWizard();
}

// New Scope Functions
function openNewScopeModal() {
    document.getElementById('new-scope-name').value = '';
    document.getElementById('new-scope-urls').value = '';
    document.getElementById('new-scope-modal').classList.remove('hidden');
}

function closeNewScopeModal() {
    document.getElementById('new-scope-modal').classList.add('hidden');
}

async function saveNewScope() {
    const name = document.getElementById('new-scope-name').value.trim();
    const urlsText = document.getElementById('new-scope-urls').value.trim();
    
    if (!name) return alert('Please enter a scope name.');
    if (!urlsText) return alert('Please enter at least one URL.');
    
    const urls = urlsText.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    
    try {
        const res = await fetch('/api/scopes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, urls })
        });
        
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse response as JSON:', text);
            throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
        }

        if (data.success) {
            closeNewScopeModal();
            loadInitialData();
        } else {
            alert(data.error || 'Failed to save scope');
        }
    } catch (err) {
        console.error('Error saving scope:', err);
        alert(`An error occurred while saving the scope: ${err.message}`);
    }
}

// Sitemap Import Functions
function openImportModal() {
    document.getElementById('import-scope-name').value = '';
    document.getElementById('import-sitemap-url').value = '';
    document.getElementById('import-sitemap-modal').classList.remove('hidden');
}

function closeImportModal() {
    document.getElementById('import-sitemap-modal').classList.add('hidden');
}

async function importSitemap() {
    const name = document.getElementById('import-scope-name').value.trim();
    const sitemapUrl = document.getElementById('import-sitemap-url').value.trim();
    const btn = document.getElementById('import-submit-btn');
    
    if (!name) return alert('Please enter a scope name.');
    if (!sitemapUrl) return alert('Please enter a sitemap URL.');
    
    // UI Loading State
    btn.disabled = true;
    btn.innerHTML = `<svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right: 8px; animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Importing...`;
    
    try {
        const res = await fetch('/api/scopes/import-sitemap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, sitemapUrl })
        });
        
        const data = await res.json();
        if (data.success) {
            alert(`Successfully imported ${data.urlCount} URLs!`);
            closeImportModal();
            loadInitialData();
        } else {
            alert(data.error || 'Failed to import sitemap');
        }
    } catch (err) {
        console.error('Error importing sitemap:', err);
        alert('An error occurred while importing the sitemap.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Import URLs';
    }
}

// Settings Functions
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const settings = await res.json();
        
        if (settings.visionKey) document.getElementById('setting-vision-key').value = settings.visionKey;
        if (settings.codaToken) document.getElementById('setting-coda-token').value = settings.codaToken;
        if (settings.codaDocId) document.getElementById('setting-coda-doc-id').value = settings.codaDocId;
        if (settings.concurrency) document.getElementById('setting-concurrency').value = settings.concurrency;
        if (settings.timeout) document.getElementById('setting-timeout').value = settings.timeout;
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

async function saveSettings() {
    const settings = {
        visionKey: document.getElementById('setting-vision-key').value.trim(),
        codaToken: document.getElementById('setting-coda-token').value.trim(),
        codaDocId: document.getElementById('setting-coda-doc-id').value.trim(),
        concurrency: parseInt(document.getElementById('setting-concurrency').value),
        timeout: parseInt(document.getElementById('setting-timeout').value)
    };
    
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        const data = await res.json();
        if (data.success) {
            alert('Settings saved successfully!');
        } else {
            alert('Failed to save settings');
        }
    } catch (err) {
        console.error('Error saving settings:', err);
        alert('An error occurred while saving settings.');
    }
}

function togglePassword(id) {
    const input = document.getElementById(id);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
}
