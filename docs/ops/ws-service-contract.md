# ws.service Contract

Status: proposal only. This document does not install or change any service.

## Purpose

`ws.service` is the VPS-side systemd service expected to run the Office Node backend WebSocket/API server. The WebGL deployment workflow only syncs static assets to `/var/www/office`; it does not install or manage the backend service.

Manual VPS diagnostics showed the service unit is missing (`LoadState=not-found`). Repo analysis indicates the expected backend is `backend/server.js`.

## Backend Entrypoint

- Repo path: `backend/server.js`
- Package: `backend/package.json`
- Package script: `npm start` -> `node server.js`
- Preferred systemd command: `/home/antonbot/.nvm/versions/node/v22.22.0/bin/node server.js`
- Working directory: `/home/antonbot/.openclaw/workspace/office/backend`
- Runtime user proposal: `antonbot`
- Port: `8787` by default (`PORT` env may override)
- WebSocket route: `/ws`

## Health Check

`../scripts/verify_ws.js` connects to:

```text
ws://127.0.0.1:8787/ws
```

It expects a JSON state message and exits non-zero if the endpoint is unavailable, times out, closes before state, or sends invalid JSON.

## Proposed systemd Unit

```ini
[Unit]
Description=Office WebSocket backend service
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=antonbot
Group=antonbot
WorkingDirectory=/home/antonbot/.openclaw/workspace/office/backend
ExecStart=/home/antonbot/.nvm/versions/node/v22.22.0/bin/node server.js
Environment=NODE_ENV=production
Environment=PORT=8787
# EnvironmentFile=-/home/antonbot/.openclaw/workspace/office/backend/.env
Restart=on-failure
RestartSec=5s
TimeoutStartSec=30s
TimeoutStopSec=30s
KillSignal=SIGTERM
StandardOutput=journal
StandardError=journal
SyslogIdentifier=office-ws
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/home/antonbot/.openclaw/workspace/office

[Install]
WantedBy=multi-user.target
```

## Environment Contract

Visible variable names only:

- `PORT` — proposed `8787`
- `NODE_ENV` — proposed `production`
- `WS_ENDPOINT` — used by verifier, not service
- `LOCK_STALE_OVERRIDE`, `LOCK_TIMEOUT_MS` — optional queue tuning
- Supabase names may be needed by imported runtime modules: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY`

Do not print `.env` values. If secret-bearing config is required, use an owner-managed environment file and verify only with `test -f`.

## Nginx Relationship

Repo analysis did not find nginx config. Local verification uses `127.0.0.1:8787/ws`. If browser clients require `wss://<host>/ws`, nginx must separately proxy WebSocket traffic to port 8787; that requires a separate read-only nginx inspection/proposal before changes.

## Workflow Check

The existing workflow check should remain if WebSocket runtime is required, but it should later gain diagnostic-only evidence for missing-unit vs inactive-service failures.
