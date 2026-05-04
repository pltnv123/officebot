# WebStudio Sandbox Security Plan

## Overview

WebStudio uses sandboxed execution for untrusted code, third-party skills, and risky operations.

## Sandbox Layers

### Layer 1: Workspace Isolation

Each specialist workspace is isolated:
- `~/.openclaw/workspace-*/` — Separate directories
- Independent brain files
- No shared state unless explicitly routed

### Layer 2: Subagent Isolation

Subagents spawn with isolated context by default:
```bash
sessions_spawn(
  task="<task>",
  context="isolated"  # Default — no transcript access
)
```

Use `context="fork"` only when child needs current transcript.

### Layer 3: Exec Security Modes

```bash
exec(
  command="<command>",
  security="deny|allowlist|full"
)
```

| Mode | Behavior |
|------|----------|
| deny | Block all exec |
| allowlist | Allow only approved commands |
| full | Allow all (requires approval) |

### Layer 4: Approval Lock Engine

Risky commands require user approval:
- Destructive operations (rm, delete)
- Network operations (curl to unknown endpoints)
- Filesystem writes outside workspace
- Secret access

**Approval format:**
```
Reply with: /approve <approval-id>
```

Never execute `/approve` through exec — it's user-facing only.

## Third-Party Skill Sandboxing

### Before Install

1. Inspect SKILL.md completely
2. Check for:
   - Secret/env requirements
   - Shell command usage
   - Filesystem/network access
   - Credential access requests
3. Reject if suspicious

### After Install

1. Run in isolated session first
2. Monitor output for unexpected behavior
3. Verify no secret leakage
4. Quality Governor approval for risky skills

## Secret Safety

### Never Commit

- SERVICE_ROLE keys
- SUPABASE_KEY values
- TOKEN= values
- SECRET= values
- PASSWORD= values
- PRIVATE_KEY values
- API_KEY values

### Redaction Pattern

```bash
grep -RniE "SERVICE_ROLE|SUPABASE_KEY|TOKEN=|SECRET=|PASSWORD=" \
  /path/to/scan | sed -E 's/=.*/=<redacted>/'
```

### Environment Variables

Use env vars for secrets:
```bash
env | grep -Ei "SUPABASE" | sed -E 's/=.*/=<redacted>/'
```

Never print actual values.

## Filesystem Boundaries

### Allowed Writes

- `~/.openclaw/workspace/` — Main workspace
- `~/.openclaw/workspace-*/` — Specialist workspaces
- `/tmp/` — Temporary files
- Explicit user-specified paths

### Restricted Writes

- System directories (/etc, /usr, etc.)
- Other user home directories
- Root filesystem

### Scan for Unexpected Writes

```bash
# Check what was modified
git status --short
find /tmp -mmin -10 -type f 2>/dev/null
```

## Network Boundaries

### Allowed Endpoints

- GitHub API (api.github.com)
- ClawHub (clawhub.ai)
- OpenClaw docs (docs.openclaw.ai)
- User-specified endpoints

### Restricted Endpoints

- Unknown external APIs
- Credential/phishing sites
- Crypto/blockchain endpoints

### Monitor Network Activity

```bash
# Check recent network connections
ss -tnp | grep -E "ESTABLISHED|SYN-SENT"
```

## Risk Classification

| Risk | Sandbox Response |
|------|------------------|
| CRITICAL | Block immediately, escalate |
| HIGH | Require approval + isolated run |
| MEDIUM | Require approval |
| LOW | Standard review |

## Emergency Stops

### Stop Conditions

- Secret detected in output
- Unexpected filesystem write
- Unknown network endpoint
- Infinite loop detected
- Memory exhaustion

### Stop Procedure

1. Kill subagent: `subagents(action="kill", target="<id>")`
2. Document exact trigger
3. Escalate to user
4. Do not retry without fixing root cause

## Security Auditor Role

**Owner:** workspace-security-auditor

**Responsibilities:**
- Review third-party skills before install
- Scan for secret leakage
- Verify sandbox boundaries
- Assess network/filesystem risks
- Approve/reject risky operations

**Tools:**
- Secret scan patterns
- Filesystem diff checks
- Network connection monitoring
- Risk classification matrix

## See Also

- `docs/webstudio-risk-classification.md`
- `workspace-security-auditor/SOUL.md`
- `docs/webstudio-skill-curator-policy.md`
