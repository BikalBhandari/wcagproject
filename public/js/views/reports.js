import { api } from '../modules/api.js';
import { state as appState } from '../modules/state.js';

export async function init() {
    console.log('Initializing Reports View...');
    await loadReports();
}

async function loadReports() {
    try {
        const reports = await api.getReports();
        renderReports(reports);
    } catch (err) {
        console.error('Error loading reports:', err);
        const tbody = document.getElementById('audit-reports-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--danger);">Failed to load reports: ${err.message}</td></tr>`;
        }
    }
}

function renderReports(reports) {
    const tbody = document.getElementById('audit-reports-tbody');
    if (!tbody) return;

    if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-dim);">No reports generated yet.</td></tr>';
        return;
    }

    // Sort reports by timestamp descending
    const sortedReports = [...reports].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    tbody.innerHTML = sortedReports.map((report, i) => {
        const date = new Date(report.timestamp);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        // Determine site name: Metadata Scope > Metadata Domain > Metadata Target > Filename
        let siteName = report.name || report.file || 'Unknown Site';
        if (report.meta?.scopeName) {
            siteName = report.meta.scopeName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else if (report.meta?.domain) {
            siteName = report.meta.domain;
        } else if (report.meta?.targetUrl) {
            try {
                siteName = new URL(report.meta.targetUrl).hostname;
            } catch(e) {}
        }

        // Determine status and colors
        let status = 'COMPLETED';
        let statusClass = 'completed';
        if (report.compliance < 70) {
            status = 'PARTIAL';
            statusClass = 'in-progress';
        }
        if (report.compliance < 30 || (report.meta && report.meta.error)) {
            status = 'FAILED';
            statusClass = 'failed';
        }

        const complianceColor = report.compliance > 80 ? 'var(--success)' : (report.compliance > 50 ? 'var(--warning)' : 'var(--danger)');
        
        // Render Agent Fleet
        const renderAgents = () => {
            if (!report.meta?.agents || report.meta.agents.length === 0) return '<span style="color: var(--text-dim);">--</span>';
            
            return report.meta.agents.map(agentId => {
                const agent = (appState.agents || []).find(a => a.name === agentId);
                const title = agent ? agent.title : agentId.replace('Agent', '');
                return `<span class="status-badge" style="background: rgba(0,0,0,0.03); color: var(--text-main); border: 1px solid rgba(0,0,0,0.05); font-size: 0.7rem; padding: 2px 6px;">${title}</span>`;
            }).join('');
        };

        // Safely get standards from wcagMap
        const renderStandards = () => {
            if (!report.meta || !report.meta.types) return '<span style="color: var(--text-dim); font-size: 0.75rem;">--</span>';
            
            const map = appState.wcagMap || {};
            const standards = new Set();
            
            Object.keys(report.meta.types).forEach(type => {
                const rules = map[type] || [];
                rules.forEach(r => {
                    if (r.criterion) {
                        standards.add(`${r.criterion} [v${r.version || '2.1'}]`);
                    }
                });
            });

            if (standards.size === 0) return '<span style="color: var(--text-dim); font-size: 0.75rem;">--</span>';

            return Array.from(standards).map(s => 
                `<span class="status-badge" style="background: rgba(140, 29, 64, 0.05); color: var(--primary); border: 1px solid rgba(140, 29, 64, 0.1); font-size: 0.7rem; padding: 2px 6px;">${s}</span>`
            ).join('');
        };

        return `
            <tr>
                <td style="font-weight: 700; color: var(--primary);">#RUN-${sortedReports.length - i}</td>
                <td style="font-size: 0.8rem; color: var(--text-dim);">${dateStr} <br> ${timeStr}</td>
                <td style="font-weight: 600; color: var(--text-main);">${siteName}</td>
                <td>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${renderAgents()}
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="height: 6px; width: 60px; background: rgba(0,0,0,0.05); border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${report.compliance}%; background: ${complianceColor};"></div>
                        </div>
                        <span style="font-weight: 700; color: ${complianceColor}; font-size: 0.8rem;">${report.compliance}%</span>
                    </div>
                </td>
        <td>
            <span style="color: ${report.missingAlt > 0 ? 'var(--danger)' : 'var(--text-dim)'}; font-size: 0.85rem; font-weight: ${report.missingAlt > 0 ? '600' : '400'};">
                ${report.meta && report.meta.error
                    ? report.meta.error
                    : (() => {
                        const issueLabel = report.missingAlt > 0 ? `${report.missingAlt} issues found` : 'No accessibility issues found';
                        const scanErrors = report.meta?.scanErrors || 0;
                        return scanErrors > 0
                            ? `${issueLabel} (${scanErrors} scan error${scanErrors === 1 ? '' : 's'})`
                            : issueLabel;
                    })()}
            </span>
        </td>
                <td>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${renderStandards()}
                    </div>
                </td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>
                    <div class="action-group">
                        <a href="/reports/${report.file}" download="${report.file}" class="action-btn" title="Download CSV">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </a>
                        <a href="/reports/${report.file.replace('.csv', '.pdf')}" download="${report.file.replace('.csv', '.pdf')}" class="action-btn pdf" title="Download PDF">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                        </a>
                        ${report.meta && report.meta.codaUrl ? `
                            <a href="${report.meta.codaUrl}" target="_blank" class="action-btn coda" title="View in Coda">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </a>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Update totals in footer
    const countFooter = document.getElementById('report-count-footer');
    const totalFooter = document.getElementById('report-total-footer');
    if (countFooter) countFooter.textContent = reports.length;
    if (totalFooter) totalFooter.textContent = reports.length;
}
