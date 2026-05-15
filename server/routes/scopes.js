const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const Sitemapper = require('sitemapper').default || require('sitemapper');

const SCOPE_DATA_DIR = path.join(__dirname, '..', '..', 'data', 'scopes');
console.log('Resolved SCOPE_DATA_DIR:', SCOPE_DATA_DIR);

function scopeFileName(name) {
    const slug = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    return `${slug || 'scope'}.json`;
}

router.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store');
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
            let domain = '';
            let urls = [];
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                urls = Array.isArray(content) ? content : [];
                urlCount = Array.isArray(content) ? content.length : 0;
                if (urlCount > 0) {
                    try {
                        const url = new URL(content[0]);
                        domain = url.hostname;
                    } catch (e) {
                        domain = content[0]; // Fallback to raw string if not a valid URL
                    }
                }
            } catch (e) {
                console.error(`Error reading scope file ${f}:`, e);
            }

            // Match reports using the same logic the user sees in the Reports table
            let lastScan = 'Never';
            try {
                const scopeReports = allReportFiles
                    .filter(r => r.toLowerCase().startsWith(scopeBase + '-') && r.endsWith('.csv'))
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
                domain: domain,
                file: f,
                urlCount: urlCount,
                lastScan: lastScan,
                urls
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
    
    const fileName = scopeFileName(name);
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

        const fileName = scopeFileName(name);
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

router.delete('/:file', (req, res) => {
    const file = path.basename(req.params.file || '');

    if (!file || !file.endsWith('.json')) {
        return res.status(400).json({ error: 'Invalid scope file' });
    }

    const filePath = path.join(SCOPE_DATA_DIR, file);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Scope not found' });
    }

    try {
        fs.unlinkSync(filePath);
        res.json({ success: true, file });
    } catch (e) {
        console.error('Error deleting scope file:', e);
        res.status(500).json({ error: 'Failed to delete scope' });
    }
});

router.put('/:file', (req, res) => {
    const oldFile = path.basename(req.params.file || '');
    const { name, urls } = req.body;

    if (!oldFile || !oldFile.endsWith('.json')) {
        return res.status(400).json({ error: 'Invalid scope file' });
    }

    if (!name || !urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'Name and URLs array are required' });
    }

    const oldPath = path.join(SCOPE_DATA_DIR, oldFile);
    if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ error: 'Scope not found' });
    }

    const newFile = scopeFileName(name);
    const newPath = path.join(SCOPE_DATA_DIR, newFile);
    const payload = JSON.stringify(urls, null, 2);

    if (newFile !== oldFile && fs.existsSync(newPath)) {
        return res.status(409).json({ error: 'Scope with this name already exists' });
    }

    try {
        if (newFile === oldFile) {
            fs.writeFileSync(oldPath, payload);
        } else {
            const tempPath = `${newPath}.tmp`;
            fs.writeFileSync(tempPath, payload);
            fs.renameSync(tempPath, newPath);

            try {
                fs.unlinkSync(oldPath);
            } catch (unlinkErr) {
                try {
                    fs.unlinkSync(newPath);
                } catch (_) {}
                throw unlinkErr;
            }
        }

        res.json({ success: true, file: newFile });
    } catch (e) {
        console.error('Error updating scope file:', e);
        res.status(500).json({ error: 'Failed to update scope' });
    }
});

module.exports = router;
