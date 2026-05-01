const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const Sitemapper = require('sitemapper').default || require('sitemapper');

const SCOPE_DATA_DIR = path.join(__dirname, '..', '..', 'data', 'scopes');
console.log('Resolved SCOPE_DATA_DIR:', SCOPE_DATA_DIR);

router.get('/', (req, res) => {
    if (!fs.existsSync(SCOPE_DATA_DIR)) {
        return res.json([]);
    }
    
    // Exact same path resolution as reports.js
    const REPORT_DIR = path.join(__dirname, '..', '..', 'output', 'reports');
    const allReportFiles = fs.existsSync(REPORT_DIR) ? fs.readdirSync(REPORT_DIR) : [];

    const files = fs.readdirSync(SCOPE_DATA_DIR);
    const scopes = files
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const filePath = path.join(SCOPE_DATA_DIR, f);
            const scopeBase = f.replace('.json', '').toLowerCase();
            let urlCount = 0;
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                urlCount = Array.isArray(content) ? content.length : 0;
            } catch (e) {
                console.error(`Error reading scope file ${f}:`, e);
            }

            // Match reports using the same logic the user sees in the Reports table
            let lastScan = 'Never';
            try {
                const scopeReports = allReportFiles
                    .filter(r => r.toLowerCase().startsWith(scopeBase + '-report') && r.endsWith('.csv'))
                    .map(r => {
                        const stats = fs.statSync(path.join(REPORT_DIR, r));
                        return { name: r, time: stats.mtime };
                    })
                    .sort((a, b) => b.time.getTime() - a.time.getTime());

                if (scopeReports.length > 0) {
                    lastScan = scopeReports[0].time; // Returns the Date object which Express serializes to ISO string
                }
            } catch (err) {
                console.error(`Error finding reports for ${scopeBase}:`, err);
            }

            return {
                name: f.replace('.json', '').replace(/_/g, ' ').toUpperCase(),
                file: f,
                urlCount: urlCount,
                lastScan: lastScan
            };
        });
    res.json(scopes);
});

// Create new scope
router.post('/', (req, res) => {
    const { name, urls } = req.body;
    if (!name || !urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'Name and URLs array are required' });
    }

    console.log('Creating new scope:', { name, urls });
    
    const fileName = name.toLowerCase().replace(/\s+/g, '_') + '.json';
    const filePath = path.join(SCOPE_DATA_DIR, fileName);

    if (fs.existsSync(filePath)) {
        return res.status(400).json({ error: 'Scope with this name already exists' });
    }

    try {
        fs.writeFileSync(filePath, JSON.stringify(urls, null, 2));
        res.json({ success: true, file: fileName });
    } catch (e) {
        console.error('Error saving scope file:', e);
        res.status(500).json({ error: 'Failed to save scope' });
    }
});

// Import sitemap
router.post('/import-sitemap', async (req, res) => {
    const { name, sitemapUrl } = req.body;
    if (!name || !sitemapUrl) {
        return res.status(400).json({ error: 'Name and Sitemap URL are required' });
    }

    const sitemap = new Sitemapper();
    try {
        const { sites } = await sitemap.fetch(sitemapUrl);
        if (!sites || sites.length === 0) {
            return res.status(400).json({ error: 'No URLs found in sitemap' });
        }

        const fileName = name.toLowerCase().replace(/\s+/g, '_') + '.json';
        const filePath = path.join(SCOPE_DATA_DIR, fileName);

        if (fs.existsSync(filePath)) {
            return res.status(400).json({ error: 'Scope with this name already exists' });
        }

        fs.writeFileSync(filePath, JSON.stringify(sites, null, 2));
        res.json({ success: true, file: fileName, urlCount: sites.length });
    } catch (e) {
        console.error('Sitemap import error:', e);
        res.status(500).json({ error: 'Failed to fetch or parse sitemap' });
    }
});

module.exports = router;

