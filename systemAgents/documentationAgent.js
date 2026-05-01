const fs = require('fs');
const path = require('path');

/**
 * Documentation Agent
 * 
 * This agent is responsible for synchronizing the project's documentation (FAQs and UI hints)
 * with the actual state of the agents in the system.
 */

async function run(context) {
    console.log('📖 Starting Documentation Synchronization...');
    
    const agentsDir = path.join(__dirname, '..', 'agents');
    const rootDir = path.join(__dirname, '..');
    const indexHtmlPath = path.join(rootDir, 'public', 'index.html');
    const scriptJsPath = path.join(rootDir, 'public', 'script.js');

    // 1. Discover all agents and extract metadata
    const agentFiles = fs.readdirSync(agentsDir).filter(f => 
        f.endsWith('.js') && 
        f !== 'index.js' && 
        f !== 'documentationAgent.js'
    );
    
    console.log(`🔍 Found ${agentFiles.length} agent files to document.`);
    
    const agentsMetadata = [];
    for (const file of agentFiles) {
        try {
            // Use absolute path for require
            const agentPath = path.join(agentsDir, file);
            // Clear cache to ensure we get latest metadata if it changed
            delete require.cache[require.resolve(agentPath)];
            const agent = require(agentPath);
            
            if (agent.name && agent.title && agent.description) {
                agentsMetadata.push({
                    name: agent.name,
                    title: agent.title,
                    subtitle: agent.subtitle,
                    skills: agent.skills,
                    description: agent.description,
                    fileName: file
                });
                console.log(`✅ Extracted metadata for: ${agent.title}`);
            } else {
                console.warn(`⚠️ Agent ${file} is missing required documentation fields (name, title, or description).`);
            }
        } catch (e) {
            console.error(`❌ Error reading agent ${file}:`, e.message);
        }
    }

    let updatesMade = 0;

    // 2. Update index.html FAQ section
    if (fs.existsSync(indexHtmlPath)) {
        let html = fs.readFileSync(indexHtmlPath, 'utf8');
        const faqStartTag = '<!-- FAQ_AGENTS_START -->';
        const faqEndTag = '<!-- FAQ_AGENTS_END -->';
        
        if (html.includes(faqStartTag) && html.includes(faqEndTag)) {
            const faqContent = agentsMetadata.map(a => `
                                        <li><strong>${a.title}:</strong> ${a.description}</li>`).join('');
            
            const startIdx = html.indexOf(faqStartTag) + faqStartTag.length;
            const endIdx = html.indexOf(faqEndTag);
            
            const newHtml = html.substring(0, startIdx) + faqContent + '\n                                        ' + html.substring(endIdx);
            
            if (html !== newHtml) {
                fs.writeFileSync(indexHtmlPath, newHtml);
                console.log('📄 Updated FAQs in index.html');
                updatesMade++;
            } else {
                console.log('📄 FAQs in index.html are already up to date.');
            }
        }
    }

    // 3. Update script.js auditInfo
    if (fs.existsSync(scriptJsPath)) {
        let script = fs.readFileSync(scriptJsPath, 'utf8');
        const auditInfoStart = '// AUDIT_INFO_START';
        const auditInfoEnd = '// AUDIT_INFO_END';

        if (script.includes(auditInfoStart) && script.includes(auditInfoEnd)) {
            const auditInfo = {};
            agentsMetadata.forEach(a => {
                const key = a.fileName.replace('.js', '');
                auditInfo[key] = {
                    title: a.title,
                    subtitle: a.subtitle || 'Audit Agent',
                    skills: a.skills || ['Accessibility'],
                    description: a.description
                };
            });
            
            const auditInfoContent = `const auditInfo = ${JSON.stringify(auditInfo, null, 8)};`;
            
            const startIdx = script.indexOf(auditInfoStart) + auditInfoStart.length;
            const endIdx = script.indexOf(auditInfoEnd);
            
            const newScript = script.substring(0, startIdx) + '\n    ' + auditInfoContent + '\n    ' + script.substring(endIdx);
            
            if (script !== newScript) {
                fs.writeFileSync(scriptJsPath, newScript);
                console.log('📜 Updated auditInfo in script.js');
                updatesMade++;
            } else {
                console.log('📜 auditInfo in script.js is already up to date.');
            }
        }
    }

    console.log('✨ Documentation synchronization complete.');

    return [{
        type: 'documentation',
        page: 'Internal codebase',
        element: 'FAQ & UI Helpers',
        message: updatesMade > 0 
            ? `Successfully synchronized documentation for ${agentsMetadata.length} agents (${updatesMade} files updated).`
            : `Documentation is already synchronized for ${agentsMetadata.length} agents.`,
        severity: 'low',
        recommendation: 'No action needed. Documentation is in sync.'
    }];
}

module.exports = {
    name: 'documentation',
    title: 'Documentation Sync Agent',
    description: 'A maintenance agent that automatically synchronizes agent documentation (titles and descriptions) with the dashboard UI and FAQs when new agents are added.',
    run
};
