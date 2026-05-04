# SKILL — webstudio-organism-memory-check

## Purpose

Verify WebStudio organism memory is properly configured and persistent:
- Supabase runtime env stored securely outside repo
- WebStudio server starts with organism env every time
- /api/state is mandatory health proof
- QWD/QMD + lossless-claw + Supabase are permanently encoded as brain/memory substrate

## Location

`/home/antonbot/.openclaw/workspace/office/skills/webstudio-organism-memory-check/`

## Commands

### Check organism memory

```bash
node skills/webstudio-organism-memory-check/check.js
```

### Start server with organism env

```bash
bash scripts/start-webstudio-demo-with-organism-env.sh
```

### Verify /api/state

```bash
curl -sS http://127.0.0.1:8787/api/state | python3 -m json.tool
```

### Run smoke test

```bash
node scripts/webstudio-organism-memory-smoke.js
```

## Verification Checklist

- [ ] Persistent env file exists: `~/.openclaw/secrets/webstudio-supabase.env`
- [ ] Env file permissions are 600
- [ ] Env file is NOT in /tmp
- [ ] /api/state returns JSON (not HTML, not 404)
- [ ] supabase.configured = true
- [ ] supabase.restProbeOk = true
- [ ] supabase.probeStatus = 200
- [ ] No secrets leaked in response
- [ ] QWD/QMD available (via lossless-claw)
- [ ] lossless-claw available on disk

## Rejection Rules

**REJECT if:**
- /api/state returns HTML or "Cannot GET"
- supabase.configured != true
- supabase.restProbeOk != true
- Env file only in /tmp (not persistent)
- Secret patterns detected in /api/state response
- Permissions not 600

## Safe Fallback

If Supabase unavailable:
- Document fallback (workspace files + MEMORY.md + git)
- Mark CONDITIONALLY ACCEPTED with explicit limitation
- Do not claim runtime-state tasks are complete

## Related Files

- `scripts/start-webstudio-demo-with-organism-env.sh`
- `scripts/webstudio-organism-memory-smoke.js`
- `docs/webstudio-organism-memory-runtime.md`
- `docs/webstudio-brain-substrate-policy.md`

## Security

- Never print secret values
- Always redact with `sed -E 's/=.*/=<redacted>/'`
- Never commit env files to git
- Never commit ~/.openclaw/secrets/
