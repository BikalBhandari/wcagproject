const viewContainer = document.getElementById('app-content');
const menuItems = document.querySelectorAll('.menu-item');

const viewModules = {
    dashboard: () => import('../views/dashboard.js'),
    scopes: () => import('../views/scopes.js'),
    agents: () => import('../views/agents.js'),
    reports: () => import('../views/reports.js'),
    settings: () => import('../views/settings.js'),
    faq: () => import('../views/faq.js')
};

export async function switchView(viewName) {
    try {
        // Update Sidebar UI
        menuItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === viewName);
        });

        // Fetch Partial HTML
        const response = await fetch(`/views/${viewName}.html`);
        if (!response.ok) throw new Error(`Failed to load view: ${viewName}`);
        const html = await response.text();

        // Inject HTML
        viewContainer.innerHTML = html;

        // Initialize View-Specific Logic
        if (viewModules[viewName]) {
            const module = await viewModules[viewName]();
            if (module.init) module.init();
        }

        // Update URL (optional, using hash for simplicity)
        window.location.hash = viewName;
        
    } catch (error) {
        console.error('Routing Error:', error);
        viewContainer.innerHTML = `<div class="error-view"><h2>Failed to load ${viewName}</h2><p>${error.message}</p></div>`;
    }
}

export function initRouter() {
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    // Handle initial load
    const initialView = window.location.hash.replace('#', '') || 'dashboard';
    switchView(initialView);
}
