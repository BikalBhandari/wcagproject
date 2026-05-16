import { state } from './modules/state.js';
import { api } from './modules/api.js';
import * as ui from './modules/ui.js';
import { switchView, initRouter } from './modules/router.js';

// Expose to global window for HTML onclick handlers
window.openWizard = ui.openWizard;
window.closeWizard = ui.closeWizard;
window.openNewScopeModal = ui.openNewScopeModal;
window.openImportModal = ui.openImportModal;
window.closeModal = ui.closeModal;
window.deployFleet = ui.deployFleet;
window.stopAllAgents = ui.stopAllAgents;
window.selectScanWizardScope = ui.selectScanWizardScope;
window.toggleScanWizardAgent = ui.toggleScanWizardAgent;
window.useEnabledWizardAgents = ui.useEnabledWizardAgents;
window.selectAllWizardAgents = ui.selectAllWizardAgents;
window.clearWizardAgents = ui.clearWizardAgents;
window.setScanWizardSubmitting = ui.setScanWizardSubmitting;
window.nextScanWizardStep = ui.nextScanWizardStep;
window.prevScanWizardStep = ui.prevScanWizardStep;
window.runWizardScan = ui.runWizardScan;
window.switchView = switchView;
window.logout = async () => {
    const success = await api.logout();
    if (success) {
        if (window.socket) {
            window.socket.disconnect();
        }
        window.location.replace('/login');
    } else {
        alert('Failed to log out.');
    }
};

const socket = io();
window.socket = socket; // Expose globally for view-specific actions

function getAvatarInitials(username = 'Team Session') {
    const parts = String(username).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'TS';
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function buildAvatarDataUri(username) {
    const initials = getAvatarInitials(username);
    const bg = '8C1D40';
    const fg = 'FFFFFF';
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${username}">
            <rect width="96" height="96" rx="24" fill="#${bg}"/>
            <circle cx="48" cy="48" r="32" fill="#A52B4D"/>
            <text x="48" y="58" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="30" font-weight="700" fill="#${fg}">${initials}</text>
        </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App Initializing...');
    
    // Load Initial Data
    await loadData();
    
    // Initialize Router
    initRouter();
    
    // Initialize Socket
    setupSocket();
});

async function loadData() {
    try {
        const auth = await api.getAuthStatus();
        if (!auth?.authenticated) {
            window.location.replace('/login');
            return;
        }

        const [scopes, agents, reports, wcagMap] = await Promise.all([
            api.getScopes(),
            api.getAgents(),
            api.getReports(),
            api.getWcagMap()
        ]);
        state.scopes = scopes;
        state.agents = agents;
        state.reports = reports;
        state.wcagMap = wcagMap;

        const userName = document.getElementById('session-user-name');
        if (userName && auth?.authenticated && auth.user?.username) {
            userName.textContent = auth.user.username;
        }

        const userAvatar = document.getElementById('session-user-avatar');
        if (userAvatar) {
            const avatarName = auth?.authenticated && auth.user?.username ? auth.user.username : 'Team Session';
            userAvatar.src = buildAvatarDataUri(avatarName);
        }
    } catch (err) {
        console.error('Initial Load Failed:', err);
    }
}

function setupSocket() {
    socket.on('connect', () => console.log('Connected to server'));
    socket.on('connect_error', (err) => {
        if (String(err?.message || '').toLowerCase().includes('unauthorized')) {
            window.location.replace('/login');
        }
    });
    
    socket.on('auditStarted', (data) => {
        state.isAuditing = true;
        state.activeAuditFile = data.file;
        state.scanProgress = 0;
        state.scanProgressText = 'Scan started';
        if (window.closeWizard) {
            window.closeWizard();
        }
        updateGlobalUI();
        updateGlobalProgress(0);
    });

    socket.on('auditError', (data) => {
        state.isAuditing = false;
        state.activeAuditFile = null;
        state.scanProgress = 0;
        state.scanProgressText = '';
        if (window.setScanWizardSubmitting) {
            window.setScanWizardSubmitting(false);
        }
        updateGlobalUI();
        updateGlobalProgress(0);
        alert(data?.error || 'The scan could not be started.');
    });

    socket.on('progress', (data) => {
        const percent = data.total > 0 ? (data.processed / data.total) * 100 : 0;
        state.scanProgress = percent;
        state.scanProgressText = `${data.processed} of ${data.total} pages scanned`;
        updateGlobalProgress(percent);
        updateGlobalUI();
    });

    socket.on('auditComplete', async (data) => {
        state.isAuditing = false;
        state.activeAuditFile = null;
        await loadData();
        if (window.refreshScopes) {
            await window.refreshScopes();
        }
        if (window.refreshDashboardView) {
            window.refreshDashboardView();
        }
        state.scanProgress = 100;
        state.scanProgressText = 'Scan complete';
        updateGlobalUI();
        updateGlobalProgress(100);
    });
}

function updateGlobalUI() {
    const miniStatus = document.getElementById('mini-status');
    if (miniStatus) {
        miniStatus.classList.toggle('is-live', state.isAuditing);
        miniStatus.textContent = state.isAuditing
            ? `Scan in progress: ${state.scanProgress.toFixed(0)}%`
            : 'System Idle';
    }

    const scanAnnouncement = document.getElementById('scan-announcement');
    if (scanAnnouncement) {
        if (state.isAuditing) {
            const fileLabel = state.activeAuditFile
                ? state.activeAuditFile.replace('.json', '').replace(/_/g, ' ')
                : 'current scope';
            scanAnnouncement.textContent = `Scan running for ${fileLabel} · ${state.scanProgress.toFixed(0)}%`;
            scanAnnouncement.classList.remove('hidden');
        } else {
            scanAnnouncement.classList.add('hidden');
            scanAnnouncement.textContent = '';
        }
    }

    if (window.refreshDashboardScanState) {
        window.refreshDashboardScanState();
    }

    if (!state.isAuditing) {
        updateGlobalProgress(0);
    }
}

function updateGlobalProgress(percent) {
    const bar = document.getElementById('global-progress-bar');
    if (bar) {
        bar.style.width = `${percent}%`;
        bar.classList.toggle('is-live', state.isAuditing);
    }

    const overlayBar = document.getElementById('overlay-progress-bar');
    if (overlayBar) overlayBar.style.width = `${percent}%`;
}
