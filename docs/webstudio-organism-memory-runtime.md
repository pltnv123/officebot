# WebStudio Organism Memory Runtime

## Overview

WebStudio treats Supabase + /api/state + QWD/QMD + lossless-claw as **one organism memory system**.

This document describes how to configure persistent organism memory for WebStudio.

## Persistent Runtime Environment

### Location

Supabase runtime env must be stored at:

```
~/.openclaw/secrets/webstudio-supabase.env
```

**NOT in /tmp** — /tmp is temporary and not persistent across reboots.

### Permissions

```bash
chmod 600 ~/.openclaw/secrets/webstudio-supabase.env
chmod 700 ~/.openclaw/secrets/
```

### Content (example, redacted)

```env
SUPABASE_URL=<redacted>
SUPABASE_ANON_KEY=<redacted>
SUPABASE_SERVICE_ROLE_KEY=<redacted>
```

**Never commit this file to git.**

## Startup Methods

### Method 1: Systemd User Service (PRIMARY)

```bash
systemctl --user restart webstudio-demo.service
systemctl --user status webstudio-demo.service
```

Service file: `~/.config/systemd/user/webstudio-demo.service`

**This is the primary runtime owner for WebStudio demo.**

### Runtime Owner Rule

**Port 8787 must be owned by webstudio-demo.service.**

Manual/nohup WebStudio demo process is forbidden when systemd service is available.

The server enforces this with fail-fast:
- If `PORT=8787` and any Supabase env is missing (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Server exits before binding port with error:
  `WEBSTUDIO_ORGANISM_ENV_MISSING: refusing to listen on 8787 without Supabase env`

The watchdog verifies runtime ownership:
- Compares service MainPID with port 8787 owner PID
- If mismatch: kills stale process, restarts service, verifies new owner

**ACCEPTED is forbidden if runtime owner proof is missing.**

### Method 2: Startup Script (Fallback/Manual Recovery)

```bash
bash scripts/start-webstudio-demo-with-organism-env.sh
```

This script:
- Loads `~/.openclaw/secrets/webstudio-supabase.env`
- Starts `backend/webStudioDemoServer.js` on port 8787
- Writes PID to `/tmp/webstudio-demo/server-8787.pid`
- Writes logs to `/tmp/webstudio-demo/server-8787.log`
- Does not print secrets

**Use this for manual recovery when systemd is unavailable.**

### Method 3: Manual (Fallback)

```bash
set -a
source ~/.openclaw/secrets/webstudio-supabase.env
set +a
cd /home/antonbot/.openclaw/workspace/office
PORT=8787 node backend/webStudioDemoServer.js
```

## Health Verification

### /api/state Endpoint

```bash
curl -sS http://127.0.0.1:8787/api/state | python3 -m json.tool
```

Expected response:

```json
{
  "ok": true,
  "source": "supabase_configured_runtime_probe",
  "supabase": {
    "configured": true,
    "urlPresent": true,
    "anonKeyPresent": true,
    "serviceRoleKeyPresent": true,
    "restProbeOk": true,
    "probeTable": "tasks",
    "probeStatus": 200
  },
  "qwd_qmd": {
    "status": "available_via_lossless_claw_components_not_proven_standalone"
  },
  "lossless_claw": {
    "status": "available_on_disk_per_brain_substrate_policy"
  },
  "runtime": {
    "server": "webStudioDemoServer",
    "port": 8787
  },
  "timestamp": "..."
}
```

### Smoke Test

```bash
node scripts/webstudio-organism-memory-smoke.js
```

Expected output:

```json
{
  "organism_memory_smoke_ok": true,
  "api_state_json_ok": true,
  "supabase_configured": true,
  "supabase_rest_probe_ok": true,
  "secrets_leaked": false
}
```

### Skill Check

```bash
node skills/webstudio-organism-memory-check/check.js
```

## Mandatory Proof

Before any stateful/runtime WebStudio task:

1. [ ] Persistent env exists: `~/.openclaw/secrets/webstudio-supabase.env`
2. [ ] Permissions are 600
3. [ ] /api/state returns JSON
4. [ ] supabase.configured = true
5. [ ] supabase.restProbeOk = true
6. [ ] No secrets leaked

## Forbidden Patterns

- **Env only in /tmp** — not persistent
- **/api/state returns HTML** — server not configured correctly
- **/api/state returns 404** — endpoint missing
- **Secrets in response** — security violation
- **Accepting "Supabase unavailable" after proven** — must fix root cause

## Security

- Never print secret values
- Always redact with `sed -E 's/=.*/=<redacted>/'`
- Never commit env files to git
- Never commit `~/.openclaw/secrets/`

## Related Documents

- `docs/webstudio-brain-substrate-policy.md`
- `docs/webstudio-substrate-source-of-truth.md`
- `docs/webstudio-quality-governor.md`
