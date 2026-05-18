export const api = {
    async getScopes() {
        const res = await fetch('/api/scopes', { cache: 'no-store' });
        return res.json();
    },
    async createScope(data) {
        const res = await fetch('/api/scopes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async importSitemap(data) {
        const res = await fetch('/api/scopes/import-sitemap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async deleteScope(file) {
        const res = await fetch(`/api/scopes/${encodeURIComponent(file)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        return res.ok;
    },
    async updateScope(file, data) {
        const res = await fetch(`/api/scopes/${encodeURIComponent(file)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.ok;
    },
    async getAgents() {
        const res = await fetch('/api/agents', { cache: 'no-store' });
        return res.json();
    },
    async getReports() {
        const res = await fetch('/api/reports', { cache: 'no-store' });
        return res.json();
    },
    async saveAgentConfig(name, config) {
        const res = await fetch('/api/agents/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, config })
        });
        return res.ok;
    },
    async toggleAgent(name, enabled) {
        const res = await fetch('/api/agents/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, enabled })
        });
        return res.ok;
    },
    async toggleAllAgents(enabled) {
        const res = await fetch('/api/agents/toggle-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        return res.ok;
    },
    async stopAllAgents() {
        return this.toggleAllAgents(false);
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
        const res = await fetch('/api/settings', { cache: 'no-store' });
        return res.json();
    },
    async getWcagMap() {
        const res = await fetch('/api/agents/wcag-map', { cache: 'no-store' });
        return res.json();
    },
    async getAuthStatus() {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        return res.json();
    },
    async logout() {
        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        return res.ok;
    }
};
