# ws.service Provisioning Plan

Status: proposal only. No command in this document has been executed.

## Preflight Checks

Run on the VPS before installing anything:

```bash
set -euo pipefail
id antonbot
test -d /home/antonbot/.openclaw/workspace/office
test -d /home/antonbot/.openclaw/workspace/office/backend
test -f /home/antonbot/.openclaw/workspace/office/backend/server.js
test -f /home/antonbot/.openclaw/workspace/office/backend/package.json
test -f /home/antonbot/.openclaw/workspace/office/scripts/verify_ws.js
test -x /home/antonbot/.nvm/versions/node/v22.22.0/bin/node
/home/antonbot/.nvm/versions/node/v22.22.0/bin/node --version
cd /home/antonbot/.openclaw/workspace/office/backend
test -d node_modules
node -e "require('express'); require('ws'); console.log('deps-ok')"
ss -lntp | grep ':8787' || true
systemctl status ws.service --no-pager || true
systemctl cat ws.service || true
```

Do not print secrets or `.env` values. Stop if files, Node, dependencies, or ownership are not as expected.

## Expected Files

- `/home/antonbot/.openclaw/workspace/office/backend/server.js`
- `/home/antonbot/.openclaw/workspace/office/backend/package.json`
- `/home/antonbot/.openclaw/workspace/office/backend/node_modules/express`
- `/home/antonbot/.openclaw/workspace/office/backend/node_modules/ws`
- `/home/antonbot/.openclaw/workspace/office/scripts/verify_ws.js`
- `/home/antonbot/.nvm/versions/node/v22.22.0/bin/node`

## Provisioning Commands — Not Executed

```bash
set -euo pipefail
sudo tee /etc/systemd/system/ws.service >/dev/null <<'UNIT'
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
UNIT

sudo systemctl daemon-reload
sudo systemctl enable ws.service
sudo systemctl restart ws.service
systemctl is-enabled ws.service
systemctl is-active ws.service
systemctl status ws.service --no-pager -n 30
cd /home/antonbot/.openclaw/workspace/office
/home/antonbot/.nvm/versions/node/v22.22.0/bin/node scripts/verify_ws.js
```

## Rollback Commands — Not Executed

```bash
sudo systemctl stop ws.service || true
sudo systemctl disable ws.service || true
sudo rm -f /etc/systemd/system/ws.service
sudo systemctl daemon-reload
sudo systemctl reset-failed ws.service || true
systemctl status ws.service --no-pager || true
```

## Verification Commands — Not Executed

```bash
systemctl is-enabled ws.service
systemctl is-active ws.service
systemctl show ws.service -p LoadState,ActiveState,SubState,UnitFileState,FragmentPath,ExecMainStatus,Result --no-pager
journalctl -u ws.service -n 80 --no-pager
cd /home/antonbot/.openclaw/workspace/office
/home/antonbot/.nvm/versions/node/v22.22.0/bin/node scripts/verify_ws.js
```

## Risks

- Missing backend dependencies.
- Wrong runtime user or ownership.
- Hidden environment requirements.
- Port 8787 already occupied.
- `ProtectSystem=full` incompatible if backend writes outside workspace.
- Browser WebSocket still unavailable until nginx proxy is verified if public `wss://` is required.
