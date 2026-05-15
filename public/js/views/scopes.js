import { api } from '../modules/api.js';

let scopes = [];
let scopeViewMode = 'grid';
let scopeMenuHandlersBound = false;
let editingScopeFile = null;
let editScopeUrlRowId = 0;

export async function init() {
    console.log('Initializing Scopes View...');
    bindScopeMenuHandlers();
    bindEditScopeForm();
    await loadScopes();
}

async function loadScopes() {
    try {
        scopes = await api.getScopes();
        renderScopes();
    } catch (err) {
        console.error('Error loading scopes:', err);
    }
}

function renderScopes() {
    const grid = document.getElementById('scopes-list');
    const listView = document.getElementById('scopes-list-view');
    const tbody = document.getElementById('scopes-list-tbody');

    if (!grid || !listView || !tbody) return;

    const isGrid = scopeViewMode === 'grid';
    grid.classList.toggle('hidden', !isGrid);
    listView.classList.toggle('hidden', isGrid);

    updateSwitcherState();
    renderScopeCards(grid);
    renderScopeRows(tbody);
}

function renderScopeCards(container) {
    container.innerHTML = scopes.map(scope => {
        const urlCount = formatUrlCount(scope.urlCount);
        const lastScan = formatLastScan(scope.lastScan);
        const menuId = getScopeMenuId(scope.file, 'scope-menu');

        return `
            <article class="scope-card">
                <div class="scope-card-body">
                    <div class="scope-card-header">
                        <h3 class="scope-title">${scope.name}</h3>
                        <span class="scope-status">ACTIVE</span>
                    </div>

                    <div class="scope-metrics">
                        <div class="scope-metric">
                            <span class="scope-metric-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M7 18a4 4 0 1 1 0-8 5 5 0 0 1 9.9-1.01A4 4 0 1 1 17 18H7z"></path>
                                </svg>
                            </span>
                            <div class="scope-metric-copy">
                                <span class="scope-metric-label">URL COUNT</span>
                                <span class="scope-metric-value">${urlCount}</span>
                            </div>
                        </div>

                        <div class="scope-metric">
                            <span class="scope-metric-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="9"></circle>
                                    <path d="M12 7v5l3 2"></path>
                                </svg>
                            </span>
                            <div class="scope-metric-copy">
                                <span class="scope-metric-label">LAST SCAN</span>
                                <span class="scope-metric-value ${lastScan === 'Never performed' ? 'is-muted' : ''}">${lastScan}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="scope-actions">
                    <button class="run-btn scope-run-btn" onclick="runScan('${scope.file}')">
                        <span class="play-icon-circle" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"></path>
                            </svg>
                        </span>
                        <span>Run Scan</span>
                    </button>
                    <div class="scope-menu-shell">
                        <button
                            class="scope-kebab-btn"
                            type="button"
                            aria-label="Scope actions"
                            aria-haspopup="menu"
                            aria-expanded="false"
                            data-scope-menu-trigger="${menuId}"
                            onclick="toggleScopeMenu(event, '${menuId}')"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="5" r="1.75"></circle>
                                <circle cx="12" cy="12" r="1.75"></circle>
                                <circle cx="12" cy="19" r="1.75"></circle>
                            </svg>
                        </button>
                        <div class="scope-menu" id="${menuId}" role="menu" aria-label="Scope actions">
                            <button type="button" class="scope-menu-item" onclick="closeScopeMenus(); editScope('${scope.file}')">Edit</button>
                            <button type="button" class="scope-menu-item danger" onclick="closeScopeMenus(); deleteScope('${scope.file}')">Delete</button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    if (scopes.length === 0) {
        container.innerHTML = '<div class="scopes-empty">No scopes found. Import a sitemap to get started.</div>';
    }
}

function renderScopeRows(tbody) {
    tbody.innerHTML = scopes.map(scope => `
        <tr>
            <td class="scope-row-name">${scope.name}</td>
            <td>${formatUrlCount(scope.urlCount)}</td>
            <td class="scope-row-last-scan">${formatLastScan(scope.lastScan)}</td>
            <td>
                <div class="scope-row-actions">
                    <button class="run-btn scope-row-run-btn" onclick="runScan('${scope.file}')">
                        <span class="play-icon-circle" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"></path>
                            </svg>
                        </span>
                        <span>Run Scan</span>
                    </button>
                    <div class="scope-menu-shell scope-row-menu-shell">
                        <button
                            class="scope-kebab-btn"
                            type="button"
                            aria-label="Scope actions"
                            aria-haspopup="menu"
                            aria-expanded="false"
                            data-scope-menu-trigger="${getScopeMenuId(scope.file, 'scope-row-menu')}"
                            onclick="toggleScopeMenu(event, '${getScopeMenuId(scope.file, 'scope-row-menu')}')"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="5" r="1.75"></circle>
                                <circle cx="12" cy="12" r="1.75"></circle>
                                <circle cx="12" cy="19" r="1.75"></circle>
                            </svg>
                        </button>
                        <div class="scope-menu" id="${getScopeMenuId(scope.file, 'scope-row-menu')}" role="menu" aria-label="Scope actions">
                            <button type="button" class="scope-menu-item" onclick="closeScopeMenus(); editScope('${scope.file}')">Edit</button>
                            <button type="button" class="scope-menu-item danger" onclick="closeScopeMenus(); deleteScope('${scope.file}')">Delete</button>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    if (scopes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="scopes-empty-row">No scopes found. Import a sitemap to get started.</td></tr>';
    }
}

function updateSwitcherState() {
    document.querySelectorAll('.switcher-btn[data-view-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-view-mode') === scopeViewMode);
    });
}

function formatUrlCount(count) {
    const total = Number(count) || 0;
    return `${total} URL${total === 1 ? '' : 's'}`;
}

function formatLastScan(date) {
    if (!date || date === 'Never') return 'Never performed';

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'Never performed';

    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function setScopeView(mode) {
    scopeViewMode = mode;
    renderScopes();
}

async function refreshScopes() {
    await loadScopes();
}

function bindEditScopeForm() {
    const form = document.getElementById('edit-scope-form');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveEditScope();
    });
}

function getScopeMenuId(file, prefix) {
    const safeFile = String(file || '').replace(/[^a-zA-Z0-9_-]/g, '-');
    return `${prefix}-${safeFile}`;
}

function bindScopeMenuHandlers() {
    if (scopeMenuHandlersBound) return;
    scopeMenuHandlersBound = true;

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.scope-menu-shell')) {
            closeScopeMenus();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeScopeMenus();
        }
    });
}

function closeScopeMenus() {
    document.querySelectorAll('.scope-menu.is-open').forEach(menu => {
        menu.classList.remove('is-open');
    });
    document.querySelectorAll('.scope-menu-shell.is-open').forEach(shell => {
        shell.classList.remove('is-open');
    });
    document.querySelectorAll('.scope-card.menu-open').forEach(card => {
        card.classList.remove('menu-open');
    });
    document.querySelectorAll('.scope-kebab-btn[aria-expanded="true"]').forEach(btn => {
        btn.setAttribute('aria-expanded', 'false');
    });
}

function toggleScopeMenu(event, menuId) {
    event.stopPropagation();

    const menu = document.getElementById(menuId);
    const trigger = event.currentTarget;
    if (!menu || !trigger) return;

    const willOpen = !menu.classList.contains('is-open');
    closeScopeMenus();

    if (willOpen) {
        menu.classList.add('is-open');
        const shell = trigger.closest('.scope-menu-shell');
        shell?.classList.add('is-open');
        shell?.closest('.scope-card')?.classList.add('menu-open');
        trigger.setAttribute('aria-expanded', 'true');
    }
}

async function deleteScope(file) {
    const scope = scopes.find(item => item.file === file);
    const scopeName = scope?.name || file;
    const confirmed = window.confirm(`Delete scope "${scopeName}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
        const ok = await api.deleteScope(file);
        if (!ok) {
            throw new Error('Delete request failed');
        }
        await loadScopes();
    } catch (err) {
        console.error('Error deleting scope:', err);
        alert('Unable to delete scope right now.');
    }
}

function openEditScopeModal(file) {
    const scope = scopes.find(item => item.file === file);
    if (!scope) {
        alert('Scope not found.');
        return;
    }

    editingScopeFile = file;
    editScopeUrlRowId = 0;

    const fileInput = document.getElementById('edit-scope-file');
    const nameInput = document.getElementById('edit-scope-name');
    const urlList = document.getElementById('edit-scope-url-list');

    if (fileInput) fileInput.value = file;
    if (nameInput) nameInput.value = scope.name || '';
    if (urlList) {
        renderEditScopeUrlRows(Array.isArray(scope.urls) && scope.urls.length > 0 ? scope.urls : ['']);
    }

    if (window.openModal) {
        window.openModal('edit-scope-modal');
    } else {
        document.getElementById('edit-scope-modal')?.classList.remove('hidden');
    }
}

async function saveEditScope() {
    const fileInput = document.getElementById('edit-scope-file');
    const nameInput = document.getElementById('edit-scope-name');
    const urlInputs = Array.from(document.querySelectorAll('#edit-scope-url-list input[data-edit-scope-url]'));

    const file = editingScopeFile || fileInput?.value;
    const name = nameInput?.value.trim();
    const urls = urlInputs
        .map(input => input.value.trim())
        .filter(Boolean);

    if (!file) {
        alert('Missing scope reference.');
        return;
    }

    if (!name) {
        alert('Scope name is required.');
        return;
    }

    if (urls.length === 0) {
        alert('Please enter at least one URL.');
        return;
    }

    try {
        const ok = await api.updateScope(file, { name, urls });
        if (!ok) {
            throw new Error('Update request failed');
        }

        closeEditScopeModal();
        await loadScopes();
    } catch (err) {
        console.error('Error updating scope:', err);
        alert('Unable to save scope changes right now.');
    }
}

function closeEditScopeModal() {
    editingScopeFile = null;
    const form = document.getElementById('edit-scope-form');
    if (form) form.reset();
    const urlList = document.getElementById('edit-scope-url-list');
    if (urlList) urlList.innerHTML = '';
    if (window.closeModal) {
        window.closeModal('edit-scope-modal');
    } else {
        document.getElementById('edit-scope-modal')?.classList.add('hidden');
    }
}

function renderEditScopeUrlRows(urls = ['']) {
    const urlList = document.getElementById('edit-scope-url-list');
    if (!urlList) return;

    urlList.innerHTML = '';
    const rows = urls.length > 0 ? urls : [''];
    rows.forEach(url => addEditScopeUrlRow(url, false));
    normalizeEditScopeUrlButtons();
}

function addEditScopeUrlRow(url = '', focus = true) {
    const urlList = document.getElementById('edit-scope-url-list');
    if (!urlList) return;

    editScopeUrlRowId += 1;

    const row = document.createElement('div');
    row.className = 'scope-url-row';
    row.dataset.rowId = String(editScopeUrlRowId);
    row.innerHTML = `
        <input
            type="url"
            data-edit-scope-url
            placeholder="https://example.com"
            value="${escapeHtmlAttr(url)}"
        >
        <button type="button" class="scope-url-remove-btn" aria-label="Remove URL" onclick="removeEditScopeUrlRow(this)">
            &times;
        </button>
    `;

    urlList.appendChild(row);
    normalizeEditScopeUrlButtons();

    if (focus) {
        row.querySelector('input')?.focus();
    }
}

function removeEditScopeUrlRow(button) {
    const row = button?.closest('.scope-url-row');
    const urlList = document.getElementById('edit-scope-url-list');
    if (!row || !urlList) return;

    if (urlList.querySelectorAll('.scope-url-row').length <= 1) {
        const input = row.querySelector('input[data-edit-scope-url]');
        if (input) input.value = '';
        return;
    }

    row.remove();
    normalizeEditScopeUrlButtons();
}

function normalizeEditScopeUrlButtons() {
    const rows = Array.from(document.querySelectorAll('#edit-scope-url-list .scope-url-row'));
    rows.forEach(row => {
        const removeBtn = row.querySelector('.scope-url-remove-btn');
        if (removeBtn) removeBtn.disabled = rows.length <= 1;
    });
}

function escapeHtmlAttr(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#39;');
}

// These need to be global for now because they are called from onclick in generated HTML
window.setScopeView = setScopeView;
window.refreshScopes = refreshScopes;
window.toggleScopeMenu = toggleScopeMenu;
window.closeScopeMenus = closeScopeMenus;
window.openEditScopeModal = openEditScopeModal;
window.closeEditScopeModal = closeEditScopeModal;
window.addEditScopeUrlRow = addEditScopeUrlRow;
window.removeEditScopeUrlRow = removeEditScopeUrlRow;

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

window.editScope = openEditScopeModal;

window.deleteScope = deleteScope;
