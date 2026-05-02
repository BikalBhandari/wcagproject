/**
 * Root Issue Priority System
 * Higher value = higher priority
 */
const rootPriority = {
    'Missing Alt Attribute': 3,
    'Empty Alt Attribute': 3,
    'Color Contrast': 3,
    'Keyboard Access': 3,
    'Potential Keyboard Trap': 3,
    'Focus Visible': 3,
    'ARIA Misuse': 3,
    'Target Size': 2,
    'Focus Order': 2,
    'Tabindex Misuse': 2,
    'EMPTY MISUSE': 2,
    'GENERIC': 1,
    'REDUNDANT': 1,
    'FILENAME': 1,
    'TOO SHORT': 1,
    'TOO LONG': 1,
    'Placeholder Alt Text': 1
};

/**
 * Severity Priority
 */
const severityPriority = {
    high: 3,
    medium: 2,
    low: 1
};

/**
 * Normalizes element identity.
 * 
 * Rules:
 * - If element is an <img>, extract src: '<img src="...">' → 'img:...'
 * - If element has id: → 'id:value'
 * - If element has name: → 'name:value'
 * - Otherwise: → normalized trimmed string (remove extra whitespace)
 */
function getElementSignature(element) {
    if (!element) return 'unknown';

    // 1. If element is an <img>, extract src or lazy-loaded variants
    if (element.toLowerCase().includes('<img')) {
        const srcMatch = 
            element.match(/src=["']([^"']+)["']/i) ||
            element.match(/data-src=["']([^"']+)["']/i) ||
            element.match(/data-lazy-src=["']([^"']+)["']/i) ||
            element.match(/data-original=["']([^"']+)["']/i);
            
        if (srcMatch) return `img:${srcMatch[1]}`;
    }

    // 2. If element has id
    const idMatch = element.match(/id=["']([^"']+)["']/i);
    if (idMatch) return `id:${idMatch[1]}`;

    // 3. If element has name
    const nameMatch = element.match(/name=["']([^"']+)["']/i);
    if (nameMatch) return `name:${nameMatch[1]}`;

    // 4. Otherwise: normalized trimmed string
    return element.replace(/\s+/g, ' ').trim();
}

/**
 * Deduplicates issues based on element signature and subType.
 * Keep only one issue per key. If duplicate exists, keep higher severity.
 */
function dedupeIssues(issues) {
    const seen = new Map();

    issues.forEach(issue => {
        const elementSignature = getElementSignature(issue.element);
        const key = `${elementSignature}-${issue.subType}`;

        if (!seen.has(key)) {
            seen.set(key, issue);
        } else {
            const existing = seen.get(key);
            const currentSev = severityPriority[issue.severity] || 0;
            const existingSev = severityPriority[existing.severity] || 0;

            if (currentSev > existingSev) {
                seen.set(key, issue);
            }
        }
    });

    return Array.from(seen.values());
}

/**
 * Merges issues by element to ensure one primary issue per element.
 * 
 * Logic:
 * 1. Group issues by elementSignature
 * 2. Sort each group by: rootPriority (desc), severity (desc)
 * 3. Keep ONLY the top issue per group
 * 4. Discard the rest
 */
function mergeIssuesByElement(issues) {
    const groups = new Map();

    issues.forEach(issue => {
        const signature = getElementSignature(issue.element);
        if (!groups.has(signature)) {
            groups.set(signature, []);
        }
        groups.get(signature).push(issue);
    });

    const finalIssues = [];

    for (const elementIssues of groups.values()) {
        elementIssues.sort((a, b) => {
            const priorityA = rootPriority[a.subType] || 0;
            const priorityB = rootPriority[b.subType] || 0;

            if (priorityB !== priorityA) {
                return priorityB - priorityA;
            }

            const sevA = severityPriority[a.severity] || 0;
            const sevB = severityPriority[b.severity] || 0;

            return sevB - sevA;
        });

        // Keep ONLY the top issue per group
        finalIssues.push(elementIssues[0]);
    }

    return finalIssues;
}

/**
 * Sorts final issues by severity for report output.
 */
function sortBySeverity(issues) {
    return [...issues].sort((a, b) => {
        const sevA = severityPriority[a.severity] || 0;
        const sevB = severityPriority[b.severity] || 0;
        return sevB - sevA;
    });
}

/**
 * Final post-processing pipeline.
 * Modes:
 * - 'qa': Preserve all valid distinct issues (default)
 * - 'clean': Merge issues per element (current behavior)
 */
function processIssues(issues, mode = 'qa') {
    let results = dedupeIssues(issues);

    if (mode === 'clean') {
        results = mergeIssuesByElement(results);
    }

    results = sortBySeverity(results);
    return results;
}

module.exports = {
    getElementSignature,
    dedupeIssues,
    mergeIssuesByElement,
    processIssues,
    sortBySeverity,
    rootPriority,
    severityPriority
};
