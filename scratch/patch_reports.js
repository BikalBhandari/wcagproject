const fs = require('fs');
const path = require('path');

const reportDir = path.join(process.cwd(), 'output', 'reports');

console.log(`Checking directory: ${reportDir}`);

if (fs.existsSync(reportDir)) {
    const files = fs.readdirSync(reportDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} JSON files to check.`);
    
    files.forEach(f => {
        const filePath = path.join(reportDir, f);
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Derive scopeName from filename
            const scopeName = f.split('-')[0];
            
            if (!data.scopeName || data.scopeName === 'Unknown') {
                data.scopeName = scopeName;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`✅ Patched ${f} -> ${scopeName}`);
            } else {
                console.log(`⏭️  Skipping ${f} (already has scopeName: ${data.scopeName})`);
            }
        } catch (e) {
            console.error(`❌ Failed to patch ${f}:`, e.message);
        }
    });
} else {
    console.error('Report directory not found.');
}
