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
        visionKey: document.getElementById('setting-vision-key').value,
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
    const codaToken = document.getElementById('setting-coda-token').value;
    const btn = document.querySelector('.test-btn');
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

// Global handler for password visibility toggle
window.togglePassword = (inputId, btn) => {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        btn.classList.add('active');
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        `;
    } else {
        input.type = 'password';
        btn.classList.remove('active');
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
    }
};
