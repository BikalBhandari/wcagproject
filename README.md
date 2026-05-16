# Site Image Alt Text Auditor

This tool automates the process of recording alt text for all images on specific pages. It generates a CSV report for each set of URLs.

## 🚀 New: Accessibility Dashboard
The project now includes a premium web-based dashboard where you can deploy "Agents" (based on your JSON files) to run audits and view real-time progress.

## Environment Setup
Use [`.env.example`](./.env.example) as the template for local or deployment environment variables.

Required values:
- `APP_LOGIN_USERNAME`
- `APP_LOGIN_PASSWORD`

Optional values:
- `CODA_API_TOKEN`
- `CODA_DOC_ID`
- `REDIS_URL`
- `APP_ORIGIN`
- `TRUST_PROXY`
- `PUPPETEER_NO_SANDBOX`

### Running the Dashboard
1.  Install dependencies: `npm install`
2.  Start the dashboard: `npm run dev`
3.  Open [http://localhost:3000](http://localhost:3000) in your browser.

### Shared Team Login
Set `APP_LOGIN_USERNAME` and `APP_LOGIN_PASSWORD` before starting the app. Anyone with those shared credentials can sign in through the login page without needing repo access.

## Production Deployment

### Docker Compose
Start the app and Redis together:
```bash
docker compose up --build
```

The compose file expects `APP_LOGIN_USERNAME` and `APP_LOGIN_PASSWORD` to come from your shell environment or deployment platform.

### Docker Image
Build the production image directly:
```bash
docker build -t site-crawler-missing-alt-text .
```

### PM2
Run the server with the process manager config:
```bash
pm2 start ecosystem.config.cjs --env production
```

### Health Checks
- `GET /healthz` returns basic process health.
- `GET /readyz` checks readiness and Redis connectivity when `REDIS_URL` is configured.

