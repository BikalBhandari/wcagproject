import { api } from '../modules/api.js';

export async function init() {
    console.log('Initializing FAQ View...');
    initFaqAccordion();
    await renderAgentCapabilities();
}

function initFaqAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        if (header) {
            header.onclick = () => {
                const isActive = item.classList.contains('active');
                accordionItems.forEach(i => i.classList.remove('active'));
                if (!isActive) item.classList.add('active');
            };
        }
    });
}

async function renderAgentCapabilities() {
    const grid = document.getElementById('faq-agent-grid');
    if (!grid) return;

    const fallback = [
        'Alt Text Presence',
        'Alt Text Quality',
        'Form Accessibility',
        'Form Errors',
        'Heading Outline',
        'Landmark & Outline',
        'Link Integrity',
        'Link Text',
        'Navigation Flow',
        'Keyboard Accessibility',
        'Focus Visibility & Order',
        'ARIA Validation',
        'Touch Target Heuristics',
        'Color Contrast',
        'Legacy WCAG'
    ];

    try {
        const agents = await api.getAgents();
        const configuredAgents = Array.isArray(agents) ? agents : [];

        if (configuredAgents.length === 0) {
            grid.innerHTML = '<div class="agent-loading">No agents are currently configured.</div>';
            return;
        }

        grid.innerHTML = configuredAgents
            .map(agent => {
                const title = agent.title || humanizeAgentName(agent.name);
                const description = agent.description || 'Configured accessibility coverage for this audit area.';
                const badge = humanizeCategory(agent.category || '');
                return `
                    <div class="faq-card agent-item">
                        <span class="agent-badge">${escapeHtml(badge)}</span>
                        <h5>${escapeHtml(title)}</h5>
                        <p>${escapeHtml(description)}</p>
                    </div>
                `;
            })
            .join('');
    } catch (err) {
        console.error('Error loading FAQ agent list:', err);
        grid.innerHTML = fallback
            .map(name => `
                <div class="faq-card agent-item">
                    <span class="agent-badge">Agent</span>
                    <h5>${escapeHtml(name)}</h5>
                    <p>Configured accessibility coverage for this audit area.</p>
                </div>
            `)
            .join('');
    }
}

function humanizeAgentName(name = '') {
    return name
        .replace(/Agent$/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, char => char.toUpperCase());
}

function humanizeCategory(category = '') {
    if (!category) return 'Agent';
    return category
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, char => char.toUpperCase());
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
