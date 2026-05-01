# Skill: Web Auditing (Axios & Cheerio)

## Overview
The auditing engine fetches HTML content and parses it to find images and evaluate their accessibility (alt text).

## Core Libraries
- **Axios**: Used for fetching page source. Includes a custom `User-Agent` to avoid being blocked by simple bots filters and a `timeout` to prevent hanging on slow sites.
- **Cheerio**: Loads the HTML into a jQuery-like DOM structure for easy querying.

## Alt Text Validation Logic
Alt text is categorized into four states:
1.  **MISSING**: The `alt` attribute is completely absent.
2.  **EMPTY**: The `alt` attribute exists but is empty (e.g., `alt=""`).
3.  **INVALID**: The `alt` text contains placeholder patterns like "image", "logo", or file extensions (e.g., "header.jpg").
4.  **VALID**: Descriptive text that doesn't match invalid patterns.

## Form Accessibility Validation Logic
Form controls must be accessible to screen readers:
1.  **LABELS**: Every input, textarea, and select must have a programmatically associated label (via `for` attribute, wrapping, or ARIA).
2.  **RECOGNIZABLE**: Buttons must have text content or an `aria-label`.
3.  **REQUIRED**: Required fields must be indicated both visually (e.g., "*") and programmatically (`aria-required` or `required` attribute).
4.  **GROUPS**: Related radio buttons or checkboxes should be grouped in a `fieldset` with a `legend`.

## Link Integrity Validation Logic
Links must provide clear navigation:
1.  **HREF**: Links must have a valid `href` attribute (no empty or `javascript:void` links).
2.  **STATUS**: Links must not lead to 404 or other error pages (Broken Links).
3.  **TEXT**: Links should have descriptive text (handled by UX agents).

## Implementation Pattern
```javascript
const $ = cheerio.load(data);
$('img').each((i, el) => {
    const alt = $(el).attr('alt');
    const src = $(el).attr('src');
    const status = validateAltText(alt);
    // ... record results
});
```

## Post-Processing & Normalization
After the raw data is collected, the system runs an **Intelligent Post-Processing Pipeline** (`utils/postProcessor.js`):
1.  **Normalization**: Elements are identified by stable signatures (src, id, or name) to prevent duplicate reporting across parallel agents.
2.  **Deduplication**: Exact duplicates are removed, keeping the highest severity instance.
3.  **Priority Merging**: If an element has multiple conflicting issues, the system keeps only the highest priority "Root Problem" (e.g., *Missing Alt* > *Generic Alt*).
4.  **Sorting**: Final issues are sorted by severity (`high` > `medium` > `low`) for the final report.

## Best Practices
- Always check both `src` and `data-src` (for lazy-loaded images).
- Use a list of regex patterns to catch low-quality placeholder alt text.
