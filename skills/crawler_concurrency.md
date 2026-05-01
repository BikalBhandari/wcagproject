# Skill: Crawler Concurrency (p-limit & Sitemapper)

## Overview
To audit hundreds or thousands of pages efficiently, the crawler uses concurrency control and sitemap discovery.

## Key Components
- **Sitemapper**: Automatically extracts all URLs from a standard XML sitemap or sitemap index.
- **p-limit**: Ensures that we only process a specific number of URLs (default: 5) at any given time. This prevents rate-limiting and memory exhaustion.

## Implementation Pattern
```javascript
const pLimit = require('p-limit');
const limit = pLimit(concurrency);

const tasks = urls.map(url => {
    return limit(async () => {
        const results = await auditUrl(url);
        // ... update progress
        return results;
    });
});

const allResults = await Promise.all(tasks);
```

## Best Practices
- Flatten the results array after `Promise.all` as each page task returns an array of images.
- Handle "mixed" inputs where a JSON file might contain a list of static URLs AND a sitemap URL.
- Use `progressCallback` inside the limited tasks to provide granular real-time updates.
