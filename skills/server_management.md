# Skill: Server Management (Express.js)

## Overview
The project uses **Express.js** to serve the dashboard and provide an API for discovery of audit "Agents" and generated "Reports".

## Key Components
- **Dashboard Hosting**: Serves the `public` directory as static assets.
- **Report Hosting**: Serves the root directory under `/reports` to allow CSV downloads.
- **API Endpoints**:
    - `GET /api/agents`: Scans the root directory for `.json` files (excluding system files) and returns a list of audit profiles.
    - `GET /api/scopes`: Scans the `data/scopes` directory for `.json` files and returns a list of audit profiles.
    - `POST /api/scopes`: Creates a new scope from a manual list of URLs.
    - `POST /api/scopes/import-sitemap`: Fetches a sitemap and saves the extracted URLs as a new scope.
    - `GET /api/reports`: Scans for `.csv` files, sorted by newest first, and returns a list of available reports.

## Implementation Patterns
```javascript
const express = require('express');
const app = express();
app.use(express.static('public'));
app.use('/reports', express.static(__dirname));

app.get('/api/agents', (req, res) => {
    // Logic to list JSON files
});
```

## Best Practices
- Keep API responses clean by stripping file extensions and formatting names (e.g., `asuo_core.json` -> `ASUO CORE`).
- Ensure CORS is enabled for development flexibility.
