import { api } from '../modules/api.js';

export async function init() {
    console.log('Initializing Settings View...');
    await loadSettings();
    
    // Add event listener to the save button
    const saveBtn = document.querySelector('.primary-btn');
    if (saveBtn) {
        saveBtn.onclick = saveSettings;
    }
}

async function loadSettings() {
    try {
        const settings = await api.getSettings();
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
        codaToken: document.getElementById('setting-coda-token').value,
        codaDocId: document.getElementById('setting-coda-doc-id').value,
        concurrency: parseInt(document.getElementById('setting-concurrency').value),
        timeout: parseInt(document.getElementById('setting-timeout').value)
    };

    try {
        const success = await api.saveSettings(settings);
        if (success) {
            alert('Settings saved successfully!');
        } else {
            alert('Failed to save settings.');
        }
    } catch (err) {
        console.error('Error saving settings:', err);
        alert('An error occurred while saving settings.');
    }
}

window.testCodaConnection = async () => {
    const btn = document.querySelector('.test-btn');
    const codaToken = document.getElementById('setting-coda-token').value;
    if (!codaToken) return alert('Please enter a Coda token first.');

    btn.disabled = true;
    btn.textContent = 'Testing...';

    try {
        const res = await fetch('/api/settings/test-coda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codaToken })
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Success! Your Coda token is valid.');
        } else {
            alert(`❌ Error: ${data.error}`);
        }
    } catch (err) {
        alert('❌ Network error while testing connection.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Test Connection';
    }
};
