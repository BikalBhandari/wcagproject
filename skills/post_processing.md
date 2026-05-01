# Skill: Post-Processing Pipeline

## Overview
The post-processing pipeline transforms raw data from multiple parallel agents into a clean, prioritized, and QA-ready audit report. It resolves conflicts between agents and ensures that each element is associated with its most critical accessibility issue.

## Core Logic

### 1. Element Normalization (Signature)
To match issues across different agents, the system generates a stable **Element Signature**:
- **Images**: Extracted from the `src` attribute (e.g., `img:header-logo.png`).
- **IDs**: Uses the `id` attribute if present (e.g., `id:submit-button`).
- **Names**: Uses the `name` attribute if present (e.g., `name:email-input`).
- **Fallback**: A normalized, trimmed string of the raw HTML.

### 2. Deduplication
Issues are deduped using a key composed of `${elementSignature}-${subType}`. If multiple agents report the same issue for the same element, the system preserves the one with the highest **Severity**.

### 3. Priority Merging
When an element has multiple *different* issues (e.g., "Missing Alt" from one agent and "Generic Alt" from another), the system uses a **Root Priority** system to keep only the most important one:

| Issue Type | Priority |
| :--- | :--- |
| Missing Alt Attribute | 3 (High) |
| Empty Alt Attribute | 3 (High) |
| EMPTY MISUSE | 2 (Medium) |
| GENERIC | 1 (Low) |
| REDUNDANT | 1 (Low) |

### 4. Severity Sorting
Final results are sorted by severity (`high` > `medium` > `low`) to ensure the most critical items appear at the top of the report.

## Implementation Pattern
The pipeline is encapsulated in `utils/postProcessor.js` and follows this flow:
1. `dedupeIssues`: Removes exact duplicates across agents.
2. `mergeIssuesByElement`: Resolves conflicts by keeping the highest priority issue per element.
3. `sortBySeverity`: Orders the final list for reporting.

## Best Practices
- Always use the `elementSignature` for comparisons rather than raw HTML strings, which can vary slightly between agents.
- Regularly update `rootPriority` as new agents or issue types are added to the fleet.
