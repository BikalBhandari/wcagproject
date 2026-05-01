# Skill: Real-time Updates (Socket.io)

## Overview
**Socket.io** is used to provide real-time feedback from the auditing engine to the frontend dashboard. This prevents the UI from "hanging" during long-running crawls.

## Event Lifecycle
1.  **`startAudit` (Client -> Server)**: Triggered when a user clicks "Launch Agent". Sends the filename of the target JSON.
2.  **`auditStarted` (Server -> Client)**: Acknowledges the start of the process.
3.  **`progress` (Server -> Client)**: Sent repeatedly during the audit. Contains:
    - `total`: Total URLs to scan.
    - `current`: Number of URLs scanned so far.
    - `percentage`: Completion percentage.
    - `lastUrl`: The URL most recently processed.
4.  **`auditComplete` (Server -> Client)**: Final signal with audit stats and the report filename.
5.  **`auditError` (Server -> Client)**: Handles unexpected failures.

## Implementation Pattern
```javascript
io.on('connection', (socket) => {
    socket.on('startAudit', async (data) => {
        const result = await runAudit(data.file, 5, (progress) => {
            socket.emit('progress', progress);
        });
        socket.emit('auditComplete', result);
    });
});
```

## Best Practices
- Use callbacks (like `(progress) => {}`) passed into the auditor to decouple business logic from the transport layer (Socket.io).
- Ensure the client reconnects automatically if the server restarts.
