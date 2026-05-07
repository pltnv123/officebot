# ws.service Deploy VPS Handoff

Generated: 2026-05-07T19:39:00Z

## Current State
- `ws.service` is expected by CI but missing/not confirmed on the deploy VPS.
- Static rsync deploy does not install or manage systemd services.
- Proposed contract uses `antonbot` and `/home/antonbot/.openclaw/workspace/office/backend`.
- Provisioning remains blocked until actual deploy VPS preflight returns GO.

## Operator Handoff
1. Run the read-only VPS diagnostic script from the output handoff on the actual deploy VPS.
2. Save the script output and return it for review.
3. Do not run systemctl mutation commands.
4. Do not print `.env` or secret values.

## GO Criteria
- Correct deploy VPS confirmed.
- `antonbot` exists or owner approves alternate user.
- Backend working directory exists.
- `backend/server.js`, `backend/package.json`, `scripts/verify_ws.js` exist.
- Node binary exists/executable or alternate runtime approved.
- Port 8787 is free or used by intended backend.
- No conflicting service exists.

## Next Approval
Only after GO: request `APR-008 APPROVED — provision-ws-service-on-vps`.
