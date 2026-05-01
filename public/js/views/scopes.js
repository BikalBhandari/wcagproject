import { api } from '../modules/api.js';

export async function init() {
    console.log('Initializing Scopes View...');
    await loadScopes();
}

async function loadScopes() {
    try {
        const scopes = await api.getScopes();
        renderScopes(scopes);
    } catch (err) {
        console.error('Error loading scopes:', err);
    }
}

function renderScopes(scopes) {
    const grid = document.querySelector('.scopes-grid');
    if (!grid) return;
    
    grid.innerHTML = scopes.map(scope => `
        <div class="scope-card">
            <div class="scope-header">
                <h3>${scope.name}</h3>
                <div class="scope-badge">${scope.urlCount || 0} URLs</div>
            </div>
            <div class="scope-details">
                <span class="last-scan">Last Scan: ${scope.lastScan === 'Never' ? 'Never' : new Date(scope.lastScan).toLocaleDateString()}</span>
            </div>
            <div class="scope-actions">
                <button class="run-btn" onclick="runScan('${scope.file}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    Run Scan
                </button>
                <button class="secondary-btn" onclick="editScope('${scope.file}')">Edit</button>
            </div>
        </div>
    `).join('');
}

// These need to be global for now because they are called from onclick in generated HTML
window.runScan = (file) => {
    console.log('🚀 Requesting scan for:', file);
    // Use the global socket initialized in main.js
    if (window.socket) {
        window.socket.emit('startAudit', { file });
    } else {
        // Fallback for direct testing
        const socket = io();
        socket.emit('startAudit', { file });
    }
};

window.editScope = (file) => {
    console.log('Editing scope:', file);
    alert('Edit feature coming soon!');
};
