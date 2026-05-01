# Skill: Navigation Flow Analysis

## Overview
This skill focuses on auditing the sequential navigation experience of a web page, specifically for keyboard and screen reader users. It identifies all interactive elements that participate in the page's tab order and extracts their semantic roles and accessible names.

## Navigable Elements
An element is considered "navigable" if it is interactive and reachable via the Tab key:
1.  **Native Interactive Elements**: `<a>` (with href), `<button>`, `<input>`, `<select>`, `<textarea>`.
2.  **Explicitly Tab-able**: Any element with a `tabindex` attribute value of `0` or greater.
3.  **Exclusions**:
    *   Elements with `tabindex="-1"`.
    *   Elements that are hidden (`display: none`, `visibility: hidden`).
    *   Elements with `aria-hidden="true"`.
    *   Links without an `href` attribute.

## Semantic Metadata
For each navigable element, the following metadata is captured:
1.  **Order**: The sequential position of the element in the DOM (which typically matches the default tab order).
2.  **Role**: The accessibility role of the element.
    *   Determined by the HTML tag (e.g., `<a>` is a "link", `<button>` is a "button").
    *   Overridden by the `role` attribute if present (e.g., `<div role="button">`).
3.  **Accessible Name**: The text that a screen reader would announce when the element receives focus.
    *   Priority: `aria-label` > `aria-labelledby` > Associated `<label>` > `title` > `placeholder` > Text Content.

## Logic Flow
```javascript
const navigableSelectors = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex="0"]';
$(navigableSelectors).each((i, el) => {
    const role = $(el).attr('role') || el.tagName.toLowerCase();
    const name = calculateAccessibleName($, el);
    // Record order i+1
});
```

## Best Practices
- Ensure that the visual focus order matches the DOM order.
- Verify that every interactive element has a clear, descriptive accessible name.
- Avoid using `tabindex` greater than `0` as it creates a confusing experience for keyboard users.
