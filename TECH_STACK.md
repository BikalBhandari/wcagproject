# Project Tech Stack

This document outlines the technologies used in the **Site Image Alt Text Auditor** project.

## 🏗️ Backend
*   **Runtime**: Node.js
*   **Web Framework**: [Express.js](https://expressjs.com/) (v5.x)
*   **Real-time Communication**: [Socket.io](https://socket.io/) — Streams live audit progress and agent status to the dashboard.
*   **Web Crawling & Parsing**:
    *   **Axios**: For making HTTP requests to fetch page content.
    *   **Cheerio**: For parsing HTML and extracting image data using a jQuery-like syntax.
    *   **Sitemapper**: For parsing XML sitemaps to discover URLs.
*   **Utilities**:
    *   **p-limit**: Controls concurrency to manage system resources during large crawls.
    *   **csv-writer**: Formats and saves audit results into CSV reports.

## 🎨 Frontend
*   **Structure**: Semantic HTML5.
*   **Styling**: Vanilla CSS3.
    *   Features a premium, responsive design system.
    *   Uses ASU branding (Maroon, Gold, and Greyscale).
    *   Leverages CSS Variables for theme management.
*   **Logic**: Vanilla JavaScript (ES6+).
    *   Handles real-time data updates via Socket.io.
    *   Manages the "Agent" lifecycle and UI state.

## 📊 Data Flow
1.  **Input**: JSON configuration files containing target URLs.
2.  **Processing**: Node.js worker (via `auditor.js`) crawls pages and analyzes images.
3.  **Real-time**: Progress is emitted via WebSockets to the `index.html` dashboard.
4.  **Output**: Detailed CSV reports generated for each audit run.
