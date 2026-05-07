# ws.service Readiness Checklist

Status: checklist only. It does not authorize server changes.

## Host Identity

- [ ] Target VPS is the GitHub Actions deploy host.
- [ ] Runtime user is confirmed (`antonbot` proposed).
- [ ] Owner approved exact service unit before installation.

## Filesystem

- [ ] `/home/antonbot/.openclaw/workspace/office` exists.
- [ ] `/home/antonbot/.openclaw/workspace/office/backend` exists.
- [ ] `backend/server.js` exists.
- [ ] `backend/package.json` exists.
- [ ] `scripts/verify_ws.js` exists.
- [ ] Runtime user can read project files.
- [ ] Runtime user can write only to approved runtime paths.

## Node Runtime

- [ ] `/home/antonbot/.nvm/versions/node/v22.22.0/bin/node` exists and is executable.
- [ ] Node version captured.
- [ ] `backend/node_modules` exists.
- [ ] `require('express')` succeeds.
- [ ] `require('ws')` succeeds.

## Environment

Verify names only; never print values:

- [ ] `PORT` (proposed `8787`).
- [ ] `NODE_ENV` (proposed `production`).
- [ ] Optional queue tuning: `LOCK_STALE_OVERRIDE`, `LOCK_TIMEOUT_MS`.
- [ ] If needed by runtime modules: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY`.
- [ ] If `.env` is used, verify with `test -f`; do not `cat` it.

## Systemd

- [ ] No conflicting existing `ws.service` unit.
- [ ] Proposed unit reviewed.
- [ ] Rollback commands reviewed.
- [ ] Service hardening options reviewed.

## Ports / Networking

- [ ] Port `8787` is free or used by the intended backend.
- [ ] Local verifier can reach `ws://127.0.0.1:8787/ws` after provisioning.
- [ ] If external browser WebSocket is required, nginx proxy for `/ws` is inspected separately.

## Post-Provisioning Verification

- [ ] `systemctl is-enabled ws.service` -> `enabled`.
- [ ] `systemctl is-active ws.service` -> `active`.
- [ ] `scripts/verify_ws.js` passes on the VPS.
- [ ] journal has no startup errors.
- [ ] CI post-deploy check passes.
