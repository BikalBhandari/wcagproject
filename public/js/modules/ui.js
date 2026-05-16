import { state } from './state.js';
import { api } from './api.js';

const wizardState = {
    step: 1,
    selectedScopeFile: null,
    selectedAgentNames: new Set(),
    submitting: false
};

let wizardBindingsReady = false;

// Modal Management
export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value = '') {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function formatCount(count = 0, singular = 'item', plural = 'items') {
    const total = Number(count) || 0;
    return `${total} ${total === 1 ? singular : plural}`;
}

function formatLastScan(lastScan) {
    if (!lastScan || lastScan === 'Never') return 'Never scanned';

    const parsed = new Date(lastScan);
    if (Number.isNaN(parsed.getTime())) return 'Never scanned';

    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatAgentLabel(agent = {}) {
    if (agent.title) return agent.title;
    return String(agent.name || '')
        .replace(/Agent$/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, letter => letter.toUpperCase())
        .trim() || 'Agent';
}

function getSelectedScope() {
    return state.scopes.find(scope => scope.file === wizardState.selectedScopeFile) || state.scopes[0] || null;
}

function getSelectedAgents() {
    return (state.agents || []).filter(agent => wizardState.selectedAgentNames.has(agent.name));
}

function getDefaultAgents() {
    const enabledAgents = (state.agents || []).filter(agent => agent.enabled);
    return (enabledAgents.length > 0 ? enabledAgents : state.agents || []).map(agent => agent.name);
}

function setWizardStep(step) {
    wizardState.step = Math.max(1, Math.min(3, step));
    renderWizard();
}

export function setScanWizardSubmitting(submitting) {
    wizardState.submitting = submitting;
    renderWizardFooter();
}

function ensureWizardBindings() {
    if (wizardBindingsReady) return;
    wizardBindingsReady = true;

    const modal = document.getElementById('scan-wizard-modal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeWizard();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const activeModal = document.getElementById('scan-wizard-modal');
        if (activeModal && !activeModal.classList.contains('hidden')) {
            closeWizard();
        }
    });
}

function renderWizardSteps() {
    const body = document.getElementById('scan-wizard-body');
    if (!body) return;

    const scope = getSelectedScope();
    const selectedAgents = getSelectedAgents();

    body.innerHTML = `
        <div class="wizard-steps-indicator" aria-label="Scan wizard steps">
            <div class="wizard-step-chip ${wizardState.step === 1 ? 'active' : ''}">
                <span class="wizard-step-number">1</span>
                <span class="wizard-step-label">Scope</span>
            </div>
            <div class="wizard-step-chip ${wizardState.step === 2 ? 'active' : ''}">
                <span class="wizard-step-number">2</span>
                <span class="wizard-step-label">Agents</span>
            </div>
            <div class="wizard-step-chip ${wizardState.step === 3 ? 'active' : ''}">
                <span class="wizard-step-number">3</span>
                <span class="wizard-step-label">Review</span>
            </div>
        </div>

        <section class="wizard-step ${wizardState.step === 1 ? 'active' : ''}" data-step="1">
            <h4>Select a scope</h4>
            <p>Pick the site or scope that should be audited in this run.</p>
            <div class="wizard-options-grid">
                ${(state.scopes || []).map(scopeItem => {
                    const isSelected = scopeItem.file === wizardState.selectedScopeFile;
                    return `
                        <label class="wizard-option ${isSelected ? 'selected' : ''}">
                            <input
                                type="radio"
                                name="scan-wizard-scope"
                                value="${escapeAttr(scopeItem.file)}"
                                ${isSelected ? 'checked' : ''}
                                onchange="selectScanWizardScope('${escapeAttr(scopeItem.file)}')"
                            >
                            <div class="option-info">
                                <span class="option-name">${escapeHtml(scopeItem.name || scopeItem.file)}</span>
                                <span class="option-meta">${escapeHtml(formatCount(scopeItem.urlCount, 'URL', 'URLs'))} · Last scan ${escapeHtml(formatLastScan(scopeItem.lastScan))}</span>
                            </div>
                        </label>
                    `;
                }).join('')}
            </div>
        </section>

        <section class="wizard-step ${wizardState.step === 2 ? 'active' : ''}" data-step="2">
            <div class="wizard-step-header">
                <div>
                    <h4>Choose agents</h4>
                    <p>Default selections use enabled agents. Adjust them before launch if you want a smaller run.</p>
                </div>
                <div class="wizard-toolbar">
                    <button type="button" class="secondary-btn" onclick="useEnabledWizardAgents()">Use enabled agents</button>
                    <button type="button" class="secondary-btn" onclick="selectAllWizardAgents()">Select all</button>
                    <button type="button" class="secondary-btn" onclick="clearWizardAgents()">Clear all</button>
                </div>
            </div>
            <div class="wizard-options-grid">
                ${(state.agents || []).map(agent => {
                    const isSelected = wizardState.selectedAgentNames.has(agent.name);
                    return `
                        <label class="wizard-option ${agent.enabled ? 'is-active' : ''} ${isSelected ? 'selected' : ''}">
                            <input
                                type="checkbox"
                                value="${escapeAttr(agent.name)}"
                                ${isSelected ? 'checked' : ''}
                                onchange="toggleScanWizardAgent('${escapeAttr(agent.name)}', this.checked)"
                            >
                            <div class="option-info">
                                <span class="option-name">${escapeHtml(formatAgentLabel(agent))}</span>
                                <span class="option-meta">${agent.enabled ? 'Enabled' : 'Available'}</span>
                            </div>
                        </label>
                    `;
                }).join('')}
            </div>
        </section>

        <section class="wizard-step ${wizardState.step === 3 ? 'active' : ''}" data-step="3">
            <h4>Review and launch</h4>
            <p>Confirm the scan details before the crawler starts.</p>
            <div class="review-summary">
                <div class="summary-item">
                    <span class="label">Scope</span>
                    <span class="value">${escapeHtml(scope ? scope.name || scope.file : 'No scope selected')}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Scope URLs</span>
                    <span class="value">${escapeHtml(scope ? formatCount(scope.urlCount, 'URL', 'URLs') : '--')}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Agents</span>
                    <span class="value">${escapeHtml(formatCount(selectedAgents.length, 'agent', 'agents'))}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Agent list</span>
                    <span class="value">${selectedAgents.length > 0 ? escapeHtml(selectedAgents.map(formatAgentLabel).join(', ')) : 'No agents selected'}</span>
                </div>
            </div>
            <div class="wizard-disclaimer">
                The scan will start immediately and progress will appear in the dashboard once the server accepts the request.
            </div>
        </section>
    `;
}

function renderWizardFooter() {
    const footer = document.getElementById('scan-wizard-footer');
    if (!footer) return;

    const canContinue = wizardState.step === 1
        ? Boolean(getSelectedScope())
        : wizardState.step === 2
            ? getSelectedAgents().length > 0
            : Boolean(getSelectedScope()) && getSelectedAgents().length > 0;

    footer.innerHTML = `
        <div class="wizard-footer-note">
            Step ${wizardState.step} of 3
        </div>
        <div class="wizard-footer-actions">
            ${wizardState.step > 1 ? `
                <button type="button" class="secondary-btn" onclick="prevScanWizardStep()">Back</button>
            ` : ''}
            <button type="button" class="secondary-btn" onclick="closeWizard()">Cancel</button>
            <button
                type="button"
                class="primary-btn"
                ${wizardState.submitting || !canContinue ? 'disabled' : ''}
                onclick="${wizardState.step === 3 ? 'runWizardScan()' : 'nextScanWizardStep()'}"
            >
                ${wizardState.submitting ? 'Starting...' : (wizardState.step === 3 ? 'Start Scan' : 'Next Step')}
            </button>
        </div>
    `;
}

function renderWizard() {
    renderWizardSteps();
    renderWizardFooter();
}

// Wizard Logic
export function openWizard() {
    ensureWizardBindings();

    if (state.isAuditing) {
        alert('A scan is already in progress.');
        return;
    }

    if (!state.scopes || state.scopes.length === 0) {
        alert('No scopes are available yet. Create a scope before starting a scan.');
        return;
    }

    if (!state.agents || state.agents.length === 0) {
        alert('No agents are available yet.');
        return;
    }

    wizardState.step = 1;
    wizardState.submitting = false;
    wizardState.selectedScopeFile = state.scopes[0]?.file || null;
    wizardState.selectedAgentNames = new Set(getDefaultAgents());

    renderWizard();
    openModal('scan-wizard-modal');
}

export function closeWizard() {
    closeModal('scan-wizard-modal');
    wizardState.step = 1;
    wizardState.submitting = false;
    wizardState.selectedScopeFile = null;
    wizardState.selectedAgentNames = new Set();
}

export function selectScanWizardScope(file) {
    wizardState.selectedScopeFile = file;
    renderWizardSteps();
    renderWizardFooter();
}

export function toggleScanWizardAgent(name, checked) {
    if (checked) {
        wizardState.selectedAgentNames.add(name);
    } else {
        wizardState.selectedAgentNames.delete(name);
    }

    renderWizardSteps();
    renderWizardFooter();
}

export function useEnabledWizardAgents() {
    const enabledNames = (state.agents || []).filter(agent => agent.enabled).map(agent => agent.name);
    wizardState.selectedAgentNames = new Set(enabledNames.length > 0 ? enabledNames : (state.agents || []).map(agent => agent.name));
    renderWizardSteps();
    renderWizardFooter();
}

export function selectAllWizardAgents() {
    wizardState.selectedAgentNames = new Set((state.agents || []).map(agent => agent.name));
    renderWizardSteps();
    renderWizardFooter();
}

export function clearWizardAgents() {
    wizardState.selectedAgentNames = new Set();
    renderWizardSteps();
    renderWizardFooter();
}

export function nextScanWizardStep() {
    if (wizardState.step === 1 && !getSelectedScope()) {
        alert('Please select a scope.');
        return;
    }

    if (wizardState.step === 2 && getSelectedAgents().length === 0) {
        alert('Please select at least one agent.');
        return;
    }

    setWizardStep(wizardState.step + 1);
}

export function prevScanWizardStep() {
    setWizardStep(wizardState.step - 1);
}

export function runWizardScan() {
    const selectedScope = getSelectedScope();
    const selectedAgents = getSelectedAgents();

    if (!selectedScope) {
        alert('Please select a scope.');
        setWizardStep(1);
        return;
    }

    if (selectedAgents.length === 0) {
        alert('Please select at least one agent.');
        setWizardStep(2);
        return;
    }

    const socket = window.socket || null;
    if (!socket) {
        alert('Scan transport is not ready yet. Please try again in a moment.');
        return;
    }

    setScanWizardSubmitting(true);
    socket.emit('startAudit', {
        file: selectedScope.file,
        agents: selectedAgents.map(agent => agent.name)
    });
}

// Scope Actions
export function openNewScopeModal() {
    openModal('new-scope-modal');
}

export function openImportModal() {
    openModal('import-sitemap-modal');
}

// Fleet Actions
export async function deployFleet() {
    const success = await api.toggleAllAgents(true);
    if (success) {
        alert('Agents enabled.');
        window.location.reload();
    }
}

export async function stopAllAgents() {
    const success = await api.stopAllAgents();
    if (success) {
        alert('Agents disabled.');
        window.location.reload();
    }
}
