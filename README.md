# Site Image Alt Text Auditor

This tool automates the process of recording alt text for all images on specific pages. It generates a CSV report for each set of URLs.

## 🚀 New: Accessibility Dashboard
The project now includes a premium web-based dashboard where you can deploy "Agents" (based on your JSON files) to run audits and view real-time progress.

### Running the Dashboard
1.  Install dependencies: `npm install`
2.  Start the dashboard: `npm run dev`
3.  Open [http://localhost:3000](http://localhost:3000) in your browser.

### 🚀 Key Features

-   **Multi-Agent Audit Fleet**: Specialized agents for Alt Text, Link Integrity, **Color Contrast**, **Keyboard Accessibility**, **Focus Management**, **ARIA Validation**, and **Touch Target Size**.
-   **Intelligent Post-Processing**: Deduplication and priority-based merging to ensure clean, actionable reports.
-   **WCAG 2.1 Level A/AA Mapping**: Every issue is automatically mapped to its corresponding WCAG success criterion.
-   **Coda Integration**: One-click sync to professional Coda dashboards for team tracking.
-   **Visual Dashboard**: Premium UI with real-time progress, compliance scores, and interactive issue filtering.
-   **Detailed Reporting**: Export results to CSV, PDF, or interactive web views.

---

## How to Run the Audit via CLI

Open your terminal in this project directory and run the command corresponding to the section you want to audit:

### 1. Core Pages
```bash
node index.js asuo_core.json
```
*   **Input**: `asuo_core.json`
*   **Output**: `asuo_core-report.csv`

### 2. Undergraduate Programs
```bash
node index.js asuo_undergrad.json
```
*   **Input**: `asuo_undergrad.json`
*   **Output**: `asuo_undergrad-report.csv`

### 3. Graduate Programs
```bash
node index.js asuo_graduate.json
```
*   **Input**: `asuo_graduate.json`
*   **Output**: `asuo_graduate-report.csv`

### 4. Certificates
```bash
node index.js asuo_certificates.json
```
*   **Input**: `asuo_certificates.json`
*   **Output**: `asuo_certificates-report.csv`

### 5. Newsroom
```bash
node index.js asuo_newsroom.json
```
*   **Input**: `asuo_newsroom.json`
*   **Output**: `asuo_newsroom-report.csv`

---

## Report Details
Each report generated will contain the following columns:
- **PAGE_URL**: The page where the image was found.
- **IMAGE_SRC**: The source link/path of the image.
- **ALT_TEXT**: The actual alt text found. 
    - If empty, it shows `[EMPTY]`.
    - If missing, it shows `[MISSING]`.

## Pro Tips
- **Concurrency**: The tool scans 5 pages at a time by default.
- **Custom Lists**: You can create any new `.json` file with an array of URLs and run it using `node index.js your_file.json`.
