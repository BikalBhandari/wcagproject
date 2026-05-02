import { state } from './modules/state.js';
import { api } from './modules/api.js';
import * as ui from './modules/ui.js';
import { switchView, initRouter } from './modules/router.js';

// Expose to global window for HTML onclick handlers
window.openWizard = ui.openWizard;
window.openNewScopeModal = ui.openNewScopeModal;
window.openImportModal = ui.openImportModal;
window.closeModal = ui.closeModal;
window.deployFleet = ui.deployFleet;
window.stopAllAgents = ui.stopAllAgents;
window.switchView = switchView;

const socket = io();
window.socket = socket; // Expose globally for view-specific actions

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
    } catch (err) {
        console.error('Initial Load Failed:', err);
    }
}

function setupSocket() {
    socket.on('connect', () => console.log('Connected to server'));
    
    socket.on('auditStarted', (data) => {
        state.isAuditing = true;
        state.activeAuditFile = data.file;
        updateGlobalUI();
    });

    socket.on('progress', (data) => {
        const percent = (data.processed / data.total) * 100;
        updateGlobalProgress(percent);
    });

    socket.on('auditComplete', async (data) => {
        state.isAuditing = false;
        await loadData();
        updateGlobalUI();
    });
}

function updateGlobalUI() {
    // Shared UI updates (mini progress bar in sidebar, etc.)
    const miniStatus = document.getElementById('mini-status');
    if (miniStatus) {
        miniStatus.textContent = state.isAuditing ? 'Scan in Progress...' : 'System Idle';
    }
}

function updateGlobalProgress(percent) {
    const bar = document.getElementById('global-progress-bar');
    if (bar) bar.style.width = `${percent}%`;
}
