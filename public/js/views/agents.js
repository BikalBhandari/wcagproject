import { api } from '../modules/api.js';

let allAgents = [];
let agentSearchQuery = '';
let agentCategoryFilter = 'all';
let currentEditingAgent = null;

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const sharedAgentSettings = [
    {
        id: 'minConfidence',
        label: 'Minimum Confidence',
        type: 'select',
        options: [
            { value: 'Any', label: 'Any confidence' },
            { value: 'Medium', label: 'Medium or higher' },
            { value: 'High', label: 'High only' }
        ],
        default: 'Any',
        hint: 'Filter out findings below this confidence level before they are saved.'
    },
    {
        id: 'maxFindingsPerPage',
        label: 'Max Findings per Page',
        type: 'range',
        min: 0,
        max: 25,
        step: 1,
        default: 0,
        hint: 'Limit how many findings this agent can contribute per page. 0 means no limit.'
    }
];

const agentSettingsSchema = {
    "altTextAgent": [
        { id: 'scanDepth', label: 'Scan Depth', type: 'range', min: 1, max: 10, step: 1, default: 3, hint: 'How many levels deep to crawl for images.' },
        { id: 'ignoreDecorative', label: 'Ignore Decorative', type: 'select', options: ['Yes', 'No'], default: 'Yes', hint: 'Skip images already marked with role="presentation".' }
    ],
    "contrastAgent": [
        { id: 'threshold', label: 'Contrast Ratio Threshold', type: 'range', min: 3, max: 7, step: 0.1, default: 4.5, hint: 'Minimum WCAG AA level is 4.5:1.' },
        { id: 'sampleRate', label: 'Sample Rate (%)', type: 'range', min: 10, max: 100, step: 10, default: 100, hint: 'Lowering this increases performance on large pages.' }
    ],
    "keyboardAgent": [
        { id: 'eventTimeout', label: 'Interaction Timeout (ms)', type: 'range', min: 100, max: 2000, step: 100, default: 500, hint: 'How long to wait for UI updates after keyboard events.' },
        { id: 'checkTraps', label: 'Detect Focus Traps', type: 'select', options: ['Yes', 'No'], default: 'Yes', hint: 'Actively attempt to escape containers to detect traps.' }
    ],
    "default": []
};

function getAgentSettingsSchema(name) {
    return [...sharedAgentSettings, ...(agentSettingsSchema[name] || agentSettingsSchema.default)];
}

export async function init() {
    console.log('Initializing Agents View...');
    
    // Add global handlers
    window.handleAgentSearch = (query) => {
        agentSearchQuery = query.toLowerCase();
        renderAgents();
    };
    
    window.filterAgentsByCategory = (category) => {
        agentCategoryFilter = category;
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            const onclick = chip.getAttribute('onclick');
            if (onclick && onclick.includes(`'${category}'`)) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
        renderAgents();
    };

    window.toggleAgent = async (name, enabled) => {
        const success = await api.toggleAgent(name, enabled);
        if (success) {
            await loadAgents();
        } else {
            alert('Failed to update agent.');
        }
    };

    window.showAgentConfig = (name) => {
        const agent = allAgents.find(a => a.name === name);
        if (!agent) return;

        currentEditingAgent = name;
        const modal = document.getElementById('config-modal');
        const title = document.getElementById('modal-agent-title');
        const settingsContent = document.getElementById('modal-settings-content');
        const subtitle = document.getElementById('modal-agent-subtitle');

        title.textContent = `${agent.title || agent.name} Parameters`;
        if (subtitle) {
            subtitle.textContent = agent.subtitle || agent.description || 'Configure operational parameters';
        }
        
        // Dynamic settings generation
        const schema = getAgentSettingsSchema(name);
        const currentConfig = agent.config || {};

        settingsContent.innerHTML = schema.map(field => {
            const val = currentConfig[field.id] !== undefined ? currentConfig[field.id] : field.default;
            
            if (field.type === 'range') {
                return `
                    <div class="config-group">
                        <div class="config-label-wrap">
                            <label for="cfg-${field.id}">${field.label}</label>
                            <span class="config-value-display" id="val-${field.id}">${val}</span>
                        </div>
                        <input type="range" id="cfg-${field.id}" name="${field.id}" 
                               min="${field.min}" max="${field.max}" step="${field.step}" value="${val}"
                               oninput="document.getElementById('val-${field.id}').textContent = this.value">
                        <p class="config-hint">${field.hint}</p>
                    </div>
                `;
            } else if (field.type === 'select') {
                const normalizedVal = String(val).trim().toLowerCase();
                const optionItems = field.options.map(opt => {
                    const value = typeof opt === 'string' ? opt : opt.value;
                    const label = typeof opt === 'string' ? opt : opt.label;
                    const isSelected = String(value).trim().toLowerCase() === normalizedVal;
                    return `<option value="${value}" ${isSelected ? 'selected' : ''}>${label}</option>`;
                }).join('');

                return `
                    <div class="config-group">
                        <div class="config-label-wrap">
                            <label for="cfg-${field.id}">${field.label}</label>
                        </div>
                        <select class="config-select" id="cfg-${field.id}" name="${field.id}">
                            ${optionItems}
                        </select>
                        <p class="config-hint">${field.hint}</p>
                    </div>
                `;
            }
            return '';
        }).join('');

        modal.classList.add('show');
    };

    window.closeAgentConfig = () => {
        document.getElementById('config-modal').classList.remove('show');
        currentEditingAgent = null;
    };

    window.saveAgentConfig = async () => {
        if (!currentEditingAgent) return;
        
        const form = document.getElementById('agent-config-form');
        const formData = new FormData(form);
        const config = {};
        formData.forEach((value, key) => {
            config[key] = value;
        });

        const success = await api.saveAgentConfig(currentEditingAgent, config);
        
        if (success) {
            // Feedback
            const saveBtn = document.querySelector('.modal-footer .primary-btn');
            const originalContent = saveBtn.innerHTML;
            
            saveBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Saved Successfully!</span>
            `;
            saveBtn.style.background = '#059669'; // Success green
            saveBtn.style.transform = 'scale(1.05)';
            
            setTimeout(async () => {
                saveBtn.innerHTML = originalContent;
                saveBtn.style.background = '';
                saveBtn.style.transform = '';
                window.closeAgentConfig();
                await loadAgents(); // Refresh data
            }, 1200);
        } else {
            alert('Failed to save agent settings.');
        }
    };

    window.deployFleet = async () => {
        const success = await api.toggleAllAgents(true);
        if (success) {
            await loadAgents();
        } else {
            alert('Failed to enable agents.');
        }
    };

    window.stopAllAgents = async () => {
        if (!confirm('Are you sure you want to disable all agents?')) return;
        const success = await api.toggleAllAgents(false);
        if (success) {
            await loadAgents();
        } else {
            alert('Failed to disable agents.');
        }
    };

    await loadAgents();
}

async function loadAgents() {
    try {
        allAgents = await api.getAgents();
        renderAgents();
    } catch (err) {
        console.error('Error loading agents:', err);
    }
}

function renderAgents() {
    const agentsList = document.getElementById('agents-list');
    if (!agentsList) return;

    // Filter agents
    const filteredAgents = allAgents.filter(agent => {
        const matchesSearch = !agentSearchQuery || 
            (agent.title && agent.title.toLowerCase().includes(agentSearchQuery)) ||
            (agent.description && agent.description.toLowerCase().includes(agentSearchQuery)) ||
            (agent.subtitle && agent.subtitle.toLowerCase().includes(agentSearchQuery)) ||
            (agent.category && agent.category.toLowerCase().includes(agentSearchQuery)) ||
            (agent.skills && agent.skills.some(s => s.toLowerCase().includes(agentSearchQuery)));
            
        const matchesCategory = agentCategoryFilter === 'all' || agent.category === agentCategoryFilter;
        
        return matchesSearch && matchesCategory;
    });

    // Update Fleet Stats
    const activeCount = allAgents.filter(a => a.enabled).length;
    const totalCount = allAgents.length;
    const activeAgentsEl = document.getElementById('stat-active-agents');
    const totalAgentsEl = document.getElementById('stat-total-agents');
    const fleetHealthEl = document.getElementById('stat-fleet-health');
    const avgCoverageEl = document.getElementById('stat-avg-coverage');
    
    if (activeAgentsEl) activeAgentsEl.textContent = activeCount;
    if (totalAgentsEl) totalAgentsEl.textContent = totalCount;
    if (fleetHealthEl) {
        const health = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
        fleetHealthEl.textContent = `${health}%`;
    }
    if (avgCoverageEl) {
        const configuredCounts = allAgents.map(a => Object.keys(a.config || {}).length);
        const avg = configuredCounts.length > 0
            ? Math.round(configuredCounts.reduce((sum, count) => sum + count, 0) / configuredCounts.length)
            : 0;
        avgCoverageEl.textContent = `${avg}`;
    }

    if (filteredAgents.length === 0) {
        agentsList.innerHTML = `
                <div class="no-results glass-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <h3>No agents match this filter</h3>
                <p>Try adjusting your search or category filter.</p>
            </div>
        `;
        return;
    }

    const categories = [
        { id: 'detection', name: 'Detection', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
        { id: 'analysis', name: 'Analysis', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>' },
        { id: 'validation', name: 'Validation', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
        { id: 'outline', name: 'Outline', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>' },
        { id: 'interaction', name: 'Interaction', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4l7 16 2.2-6.4L20 11 4 4z"></path><path d="M14 14l4 4"></path></svg>' },
        { id: 'navigation', name: 'Navigation', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>' }
    ];

    let html = '';

    if (agentCategoryFilter === 'all' && !agentSearchQuery) {
        categories.forEach(cat => {
            const catAgents = filteredAgents.filter(a => a.category === cat.id);
            if (catAgents.length > 0) {
                html += `
                    <div class="category-group" data-category="${cat.id}">
                        <div class="category-header">
                            <div class="cat-icon-wrap">${cat.icon}</div>
                            <span class="category-title">${cat.name}</span>
                            <span class="category-count">${catAgents.length} Agents</span>
                        </div>
                        <div class="audits-list-grid">
                            ${catAgents.map(agent => renderAgentCard(agent)).join('')}
                        </div>
                    </div>
                `;
            }
        });
    } else {
        html = `
            <div class="audits-list-grid">
                ${filteredAgents.map(agent => renderAgentCard(agent)).join('')}
            </div>
        `;
    }

    agentsList.innerHTML = html;
}

function renderAgentCard(agent) {
    const title = agent.title || agent.name.replace('Agent', '');
    const category = agent.category || '';
    const skills = Array.isArray(agent.skills) && agent.skills.length > 0 ? agent.skills : ['Audit'];
    const configCount = Object.keys(agent.config || {}).length;
    const status = agent.enabled ? 'active' : 'offline';
    const safeTitle = escapeHTML(title);
    const safeCategory = escapeHTML(category);
    const safeSubtitle = agent.subtitle ? escapeHTML(agent.subtitle) : '';
    const safeDescription = escapeHTML(agent.description || 'Specialized accessibility audit agent.');
    const safeSkills = skills.map(skill => escapeHTML(skill));

    return `
        <div class="audit-card glass-card ${agent.enabled ? 'is-active' : ''}" data-category="${safeCategory}">
            <div class="agent-card-header">
                <div class="agent-icon-box ${!agent.enabled ? 'offline' : ''}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                    <span class="agent-status-dot ${status}"></span>
                </div>
                <div class="agent-title-group">
                    <div class="agent-cat-label">${safeCategory.toUpperCase()}</div>
                    <h3>${safeTitle}</h3>
                    ${safeSubtitle ? `<p class="agent-subtitle">${safeSubtitle}</p>` : ''}
                </div>
                <button class="config-btn" onclick="showAgentConfig('${agent.name}')" title="Configure Agent">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </button>
            </div>

            <p class="agent-description">${safeDescription}</p>

            <div class="agent-metrics-row">
                <div class="metric-item">
                    <span class="metric-label">Config Fields</span>
                    <span class="metric-value">${configCount}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">State</span>
                    <span class="metric-value success">${agent.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
            </div>

            <div class="core-skills-section">
                <h4>Capabilities</h4>
                <div class="skills-cloud">
                    ${safeSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>

            <div class="agent-card-actions">
                <button class="main-action ${agent.enabled ? 'turn-off-btn' : 'turn-on-btn'}" onclick="toggleAgent('${agent.name}', ${!agent.enabled})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                    <span>${agent.enabled ? 'Shutdown Agent' : 'Deploy Agent'}</span>
                </button>
            </div>
        </div>
    `;
}
