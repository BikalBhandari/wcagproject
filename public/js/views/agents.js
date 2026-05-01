import { api } from '../modules/api.js';

export async function init() {
    console.log('Initializing Agents View...');
    await loadAgents();
}

async function loadAgents() {
    try {
        const agents = await api.getAgents();
        renderAgents(agents);
    } catch (err) {
        console.error('Error loading agents:', err);
    }
}

function renderAgents(agents) {
    const grid = document.getElementById('agents-list');
    if (!grid) return;

    // Use the same metadata mapping as before
    const auditInfo = {
        "altQualityAgent": {
            "title": "Alt Text Quality",
            "skills": ["Image Analysis", "Contextual Heuristics"],
            "description": "Evaluates descriptive quality of alt text using contextual heuristics and accessibility best practices."
        },
        "altTextAgent": {
            "title": "Alt Text Presence",
            "skills": ["Deep Crawling", "Alt Text Detection"],
            "description": "Identifies images missing alt attributes or improperly using empty alt text, ensuring WCAG 1.1.1 compliance."
        },
        "formAccessibilityAgent": {
            "title": "Form Accessibility",
            "skills": ["Accessibility"],
            "description": "Validates accessible labels, required field indicators, button names, and grouped inputs per WCAG."
        },
        "formErrorAgent": {
            "title": "Form Error Accessibility",
            "skills": ["Accessibility"],
            "description": "Ensures form validation errors are properly communicated, associated, and accessible to assistive technologies."
        },
        "headingStructureAgent": {
            "title": "Heading Structure",
            "skills": ["Accessibility"],
            "description": "Validates that the page has a proper heading hierarchy (one H1, no skipped levels)."
        },
        "landmarkAgent": {
            "title": "Landmark & Structure",
            "skills": ["Accessibility"],
            "description": "Validates semantic landmarks like <main>, <nav>, <header>, and <footer>."
        },
        "linkAgent": {
            "title": "Link Integrity",
            "skills": ["Accessibility"],
            "description": "Validates broken internal and external links, ensuring a seamless navigation experience."
        },
        "linkTextAgent": {
            "title": "Link Text Accessibility",
            "skills": ["Accessibility"],
            "description": "Detects non-descriptive link text, empty links, and ambiguous destination mapping."
        }
    };

    grid.innerHTML = agents.map(agent => {
        const info = auditInfo[agent.name] || { 
            title: agent.name.replace('Agent', '').toUpperCase(), 
            skills: ['Audit'], 
            description: 'Specialized accessibility agent.' 
        };
        const status = agent.enabled ? 'ACTIVE' : 'OFFLINE';
        const statusClass = status.toLowerCase();

        return `
            <div class="audit-card ${agent.enabled ? 'is-active' : ''}">
                <div class="agent-card-header">
                    <div class="agent-icon-box ${!agent.enabled ? 'offline' : ''}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/></svg>
                        <span class="agent-status-dot ${statusClass}"></span>
                    </div>
                    <div class="agent-title-group">
                        <h3>${info.title}</h3>
                        <div class="agent-status-text">
                            <span class="status-dot"></span> ${status}
                        </div>
                    </div>
                    <div class="agent-info-tip" data-tooltip="${info.description}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    </div>
                </div>

                <div class="core-skills-section">
                    <h4>Core Skills</h4>
                    <div class="skills-cloud">
                        ${info.skills.map(skill => `
                            <span class="skill-tag">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                                ${skill}
                            </span>
                        `).join('')}
                    </div>
                </div>

                <div class="agent-card-actions">
                    <button class="main-action ${agent.enabled ? 'turn-off-btn' : 'turn-on-btn'}" onclick="toggleAgent('${agent.name}', ${!agent.enabled})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                        ${agent.enabled ? 'Turn Off' : 'Turn On'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Global handler for toggle
window.toggleAgent = async (name, enabled) => {
    console.log(`Toggling agent ${name} to ${enabled}`);
    const success = await api.toggleAgent(name, enabled);
    if (success) {
        init(); // Refresh the view
    } else {
        alert('Failed to toggle agent.');
    }
};
