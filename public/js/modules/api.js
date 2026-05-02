export const api = {
    async getScopes() {
        const res = await fetch('/api/scopes');
        return res.json();
    },
    async getAgents() {
        const res = await fetch('/api/agents');
        return res.json();
    },
    async getReports() {
        const res = await fetch('/api/reports');
        return res.json();
    },
    async toggleAgent(name, enabled) {
        const res = await fetch('/api/agents/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, enabled })
        });
        return res.ok;
    },
    async stopAllAgents() {
        const res = await fetch('/api/agents/toggle-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: false })
        });
        return res.ok;
    },
    async saveSettings(settings) {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        return res.ok;
    },
    async getSettings() {
        const res = await fetch('/api/settings');
        return res.json();
    },
    async getWcagMap() {
        const res = await fetch('/api/agents/wcag-map');
        return res.json();
    }
};
