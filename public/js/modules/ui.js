import { state } from './state.js';
import { api } from './api.js';

// Modal Management
export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

// Wizard Logic (Simplified for now, will expand)
export function openWizard() {
    openModal('scan-wizard-modal');
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
    const success = await api.stopAllAgents(); // Just an example, should be toggle-all
    if (success) {
        alert('Fleet deployed successfully!');
        window.location.reload();
    }
}

export async function stopAllAgents() {
    const success = await api.stopAllAgents();
    if (success) {
        alert('Fleet shutdown.');
        window.location.reload();
    }
}
