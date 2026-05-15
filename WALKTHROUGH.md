# Alt-Text Auditor: Dashboard & Agent Walkthrough

Welcome to the **Alt-Text Auditor Dashboard**. This document explains how the new agent-based auditing system works and how to use the web interface.

## 🏗️ Architecture Overview

The system is now divided into three main layers:
1.  **Core Logic (`index.js` & `auditor.js`)**: The engine that crawls pages and extracts image metadata.
2.  **Server (`server.js`)**: A Node.js Express server that manages agents, handles API requests, and provides real-time updates via Socket.io.
3.  **Post-Processing (`utils/postProcessor.js`)**: An intelligent pipeline that dedupes, normalizes, and prioritizes issues across all agents.
4.  **Dashboard (`public/`)**: A premium, responsive web interface built with HTML, CSS, and Vanilla JS.

## 🌐 Managing Scopes
The **Scopes** view allows you to define the boundaries of your audits.

### 1. New Scope
You can manually create a new scope by clicking **"+ New Scope"**.
- Provide a descriptive name.
- Paste a list of URLs (one per line).
- This creates a new JSON configuration in the `data/scopes` directory.

### 2. Sitemap Import
For larger sites, use the **"Import Sitemap"** feature.
- Enter the URL of a standard XML sitemap (e.g., `https://example.com/sitemap.xml`).
- The system will automatically fetch and extract all URLs, creating a new scope for you.

## 🤖 Deploying Audits
Once your scope is defined, head to the **Agents** view or use the **"Run Scan"** button on a Scope card.
- **Wizard Mode**: Click **"Start New Scan"** to open the Scan Wizard.
- **Select Scope**: Choose your target URL list.
- **Select Agents**: Toggle specific agents (Alt Text, Forms, Links, etc.) to deploy.
- **Confirm & Run**: Review your configuration and start the audit.
- **Real-Time Progress**: Watch the live progress bar and stats as the agents crawl your site.

## 📁 Agent Categories
The fleet is organized into specialized groups to provide comprehensive coverage:
-   **Analysis Agents**: Deep-dive evaluators like the `contrastAgent` (Color Contrast) and `altQualityAgent` (Alt Text descriptive quality).
-   **Interaction Agents**: Focused on usability, including `keyboardAgent` (Keyboard Access), `focusAgent` (Focus Visibility & Order), and `targetSizeAgent` (Touch Target Heuristics).
-   **Validation Agents**: Ensure technical correctness, such as `ariaAgent` (ARIA Spec), `formAccessibilityAgent` (Labels & Groups), and `linkAgent` (Broken Links).

## ⚡ The Post-Processing Pipeline
When multiple agents audit the same page, they often identify overlapping issues on the same element. Our **Intelligent Post-Processor** (`utils/postProcessor.js`) handles this:
1.  **Normalization**: Creates a stable signature for every element found.
2.  **Priority Merging**: Uses a strict hierarchy to keep only the most critical "Root Issue" (e.g., *Missing Alt* > *Generic Alt*).
3.  **Conflict Resolution**: Resolves overlapping severities to ensure the highest-priority warning is presented to the user.

---


---

*Happy Auditing!*
