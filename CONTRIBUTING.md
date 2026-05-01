# Contributing to Alt-Text Auditor

## Documentation-First Development
To ensure the system remains maintainable and the FAQ stays accurate, follow these rules for every code change:

### 1. Code & Docs Sync
Whenever a core logic file (e.g., in `utils/` or `agents/`) is modified, you must immediately update the corresponding documentation in:
- `skills/*.md`: Technical implementation details.
- `agents/*.md`: Agent-specific capabilities and requirements.

### 2. User-Facing Changes
If a change affects how the user interacts with the system or understands the results (e.g., merging logic, new agent types, or severity changes), you must update:
- `public/views/faq.html`: Add or update the relevant FAQ items.
- `WALKTHROUGH.md`: Update the architectural overview or usage steps.

### 3. README Maintenance
The `README.md` should always reflect the current "Key Features" and "Tech Stack" of the production-ready code.

## Post-Processing Integrity
The `utils/postProcessor.js` is a critical bottleneck. Any changes to `rootPriority` or `getElementSignature` must be mirrored in `skills/post_processing.md` to ensure the "Source of Truth" is consistent across code and documentation.

---

> [!TIP]
> **AI Agent Tip**: If you are working with an AI coding assistant, include this instruction in your system prompt:
> *"Always check for related .md files in the /skills directory and update them proactively whenever you modify core logic in /utils or /agents."*
