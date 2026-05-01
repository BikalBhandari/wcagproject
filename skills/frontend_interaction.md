# Skill: Frontend Interaction (Vanilla JS Dashboard)

## Overview
The dashboard is a single-page application built with Vanilla JS. It handles data fetching, real-time updates via Socket.io, and dynamic DOM manipulation.

## Core Responsibilities
- **Agent Discovery**: Fetches available agents from `/api/agents` and renders them as interactive cards.
- **Audit Control**: Sends `startAudit` signals and manages the UI state (Loading vs. Running vs. Complete).
- **Progress Visualization**: Updates progress bars and stat counters in real-time based on `progress` events.
- **Report History**: Fetches previous reports from `/api/reports` and provides download links.

## Implementation Pattern
```javascript
// Socket setup
const socket = io();

// UI Update
socket.on('progress', (data) => {
    progressBar.style.width = `${data.percentage}%`;
    counter.innerText = `${data.current} / ${data.total}`;
});

// Start Audit
function launchAgent(file) {
    socket.emit('startAudit', { file });
}
```

## Styling System
- Uses a centralized `style.css` with CSS Variables for branding (e.g., `--asu-maroon`, `--asu-gold`).
- Implements responsive grid layouts for agent cards.
- Uses CSS transitions for smooth progress bar movements.

## Best Practices
- Use `DOMContentLoaded` to initialize the app.
- Sanitize any dynamic text injected into the DOM to prevent XSS.
- Disable buttons while an audit is in progress to prevent duplicate runs.
