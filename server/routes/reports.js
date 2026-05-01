const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const REPORT_OUTPUT_DIR = path.join(__dirname, '..', '..', 'output', 'reports');

router.get('/', (req, res) => {
    if (!fs.existsSync(REPORT_OUTPUT_DIR)) {
        return res.json([]);
    }
    const files = fs.readdirSync(REPORT_OUTPUT_DIR);
    const reports = files
        .filter(f => f.endsWith('.csv'))
        .sort((a, b) => {
            return fs.statSync(path.join(REPORT_OUTPUT_DIR, b)).mtime.getTime() - 
                   fs.statSync(path.join(REPORT_OUTPUT_DIR, a)).mtime.getTime();
        })
        .map(f => {
            const filePath = path.join(REPORT_OUTPUT_DIR, f);
            const metaPath = filePath.replace('.csv', '.json');
            const stats = fs.statSync(filePath);
            
            let totalImages = 0;
            let missingAlt = 0;
            let compliance = 100;
            let meta = null;

            if (fs.existsSync(metaPath)) {
                try {
                    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                    totalImages = meta.totalImages || 0;
                    missingAlt = meta.totalIssues || 0;
                    
                    // More meaningful compliance score
                    // Calculation: 100 - (Weighted Issues / Pages / IntensityFactor)
                    const pages = meta.totalPages || 1;
                    const high = meta.severity?.high || 0;
                    const medium = meta.severity?.medium || 0;
                    const low = meta.severity?.low || 0;
                    
                    const weightedScore = (high * 15) + (medium * 5) + (low * 2);
                    // Intensity factor: how many weighted issues per page constitute a "0" score
                    // Here, 20 weighted issues per page (e.g. 1 high and 1 medium) results in a very low score
                    const calculatedCompliance = 100 - (weightedScore / pages * 2);
                    compliance = Math.max(0, Math.min(100, calculatedCompliance));
                } catch (e) {
                    console.error('Error parsing meta:', metaPath);
                }
            }

            if (!meta) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(l => l.trim().length > 0);
                missingAlt = Math.max(0, lines.length - 1);
                totalImages = 0; 
                compliance = missingAlt > 0 ? Math.max(0, 100 - (missingAlt * 10)) : 100;
            }

            return {
                file: f,
                name: f.replace('-report', '').replace('.csv', '').replace(/_/g, ' ').toUpperCase(),
                timestamp: stats.mtime,
                totalImages,
                missingAlt,
                compliance: parseFloat(compliance.toFixed(1)),
                meta: meta
            };
        });
    res.json(reports);
});

module.exports = router;
