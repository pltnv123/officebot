# WebStudio Substrate Source of Truth

## Overview

This document defines the authoritative sources of truth for WebStudio claims and decisions.

## Substrate Hierarchy

When claims conflict, use this hierarchy (highest to lowest):

1. **Latest explicit user instruction** — Overrides all prior state
2. **Current Task Contract** — Formal requirements for this milestone
3. **/api/state + Supabase** — Live runtime health + durable state
4. **Runtime/browser/test evidence** — Live proof of behavior
5. **Git committed code/docs** — Implementation source of truth
6. **Workspace brain files** — Agent instructions (SOUL, AGENTS, etc.)
7. **QWD/QMD** — Retrieval knowledge (architecture, decisions)
8. **lossless-claw** — Memory continuity (session history)
9. **Skills** — Reusable procedures
10. **Model recall** — Last resort, not authoritative

## /api/state as Live Surface

The `/api/state` endpoint is the **mandatory live health surface** for WebStudio organism memory.

### Required Response

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
  "qwd_qmd": { ... },
  "lossless_claw": { ... },
  "runtime": { ... }
}
```

### Verification

```bash
curl -sS http://127.0.0.1:8787/api/state | python3 -m json.tool
```

### Rejection Criteria

**Reject if:**
- Returns HTML or "Cannot GET"
- `supabase.configured != true`
- `supabase.restProbeOk != true`
- Secret patterns detected in response
- Env file only in /tmp (not persistent)

## Persistent Environment

### Location

```
~/.openclaw/secrets/webstudio-supabase.env
```

### Permissions

```bash
chmod 600 ~/.openclaw/secrets/webstudio-supabase.env
chmod 700 ~/.openclaw/secrets/
```

### Startup

```bash
bash scripts/start-webstudio-demo-with-organism-env.sh
```

## Brain Substrate Components

| Component | Path/Endpoint | Purpose |
|-----------|---------------|---------|
| Persistent env | `~/.openclaw/secrets/webstudio-supabase.env` | Supabase credentials |
| Health probe | `http://127.0.0.1:8787/api/state` | Live runtime state |
| Smoke test | `scripts/webstudio-organism-memory-smoke.js` | Automated verification |
| Skill check | `skills/webstudio-organism-memory-check/check.js` | Detailed check |
| QWD/QMD | Via lossless-claw | Project knowledge |
| lossless-claw | `~/.openclaw/extensions/lossless-claw/` | Session memory |
| Git repo | `/home/antonbot/.openclaw/workspace/office` | Code/docs history |

## Forbidden Patterns

- **Env only in /tmp** — not persistent
- **/api/state returns HTML** — misconfigured
- **Secrets in response** — security violation
- **Accepting fallback after proven** — must fix root cause
- **Model recall over substrate** — verify with evidence

## Related Documents

- `docs/webstudio-organism-memory-runtime.md`
- `docs/webstudio-brain-substrate-policy.md`
- `docs/webstudio-quality-governor.md`
