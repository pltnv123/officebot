# WebStudio Skill Curator Policy

## OpenClaw Skill Discovery Commands

### Search Skills

```bash
# Search ClawHub/OpenClaw skills
openclaw skills search "<query>" --limit 10
openclaw skills search "<query>" --limit 10 --json
```

### List Installed Skills

```bash
# List all installed skills
openclaw skills list

# List eligible skills only
openclaw skills list --eligible

# Check skill health
openclaw skills check
```

### Inspect Skill

```bash
# Get skill metadata
openclaw skills info <skill-name>
openclaw skills info <skill-name> --json
```

### Install Skill

```bash
# Install into active workspace
openclaw skills install <skill-slug>
```

### Update Skills

```bash
# Update specific skill
openclaw skills update <skill-slug>

# Update all skills
openclaw skills update --all
```

### Manual Workspace Inspection

```bash
# Find installed skills
find /home/antonbot/.openclaw/workspace/skills -maxdepth 3 -type f -name "SKILL.md" -print | sort

# Read SKILL.md
sed -n '1,220p' /home/antonbot/.openclaw/workspace/skills/<skill>/SKILL.md
```

## Install/Update/List/Check Commands Summary

| Command | Purpose |
|---------|---------|
| `openclaw skills search "<query>"` | Discover skills |
| `openclaw skills info <name>` | Inspect metadata |
| `openclaw skills install <slug>` | Install to workspace |
| `openclaw skills list` | List installed |
| `openclaw skills list --eligible` | List eligible only |
| `openclaw skills check` | Verify health |
| `openclaw skills update <slug>` | Update skill |
| `openclaw skills update --all` | Update all |

## Workspace Skills Precedence

Skills are loaded in this order (highest precedence first):

1. **Workspace skills** — `~/.openclaw/workspace/skills/`
2. **Specialist workspace skills** — `~/.openclaw/workspace-*/skills/`
3. **Bundled skills** — OpenClaw built-in
4. **ClawHub skills** — Third-party installed

Workspace skills have **highest precedence** and can override bundled skills.

## Third-Party Skill Security Review

**All third-party skills are UNTRUSTED by default.**

### Security Screening Checklist

Before installing any skill:

- [ ] Read entire SKILL.md
- [ ] Check for secret/env requirements
- [ ] Check for obfuscated scripts
- [ ] Check for credential access requests
- [ ] Check for crypto/wallet operations
- [ ] Document shell command usage
- [ ] Document filesystem access scope
- [ ] Document network access endpoints
- [ ] Verify no hidden side effects

### Red Flags (Reject Immediately)

| Pattern | Action |
|---------|--------|
| Obfuscated scripts | REJECT |
| Credential access | REJECT (unless explicitly approved) |
| Crypto/wallet operations | REJECT |
| Hidden network calls | REJECT |
| Secret exfiltration | REJECT |
| No SKILL.md | REJECT |

### Yellow Flags (Require Approval)

| Pattern | Action |
|---------|--------|
| Secret/env required | FLAG, require user approval |
| Shell commands | INSPECT carefully |
| Network access | VERIFY endpoints |
| Filesystem write | DOCUMENT scope |

## When to Install vs When to Write Custom Skill

### Install Existing Skill When:

- Well-maintained official/bundled skill exists
- Security screening passes
- Matches task needs exactly or closely
- Saves significant development time
- No custom business logic required

### Write Custom Skill When:

- No existing skill matches needs
- Existing skills have security concerns
- Custom business logic required
- WebStudio-specific integration needed
- Need full control over behavior

### Hybrid Approach:

- Install base skill (e.g., `github`, `browser`)
- Wrap with custom WebStudio skill for specific workflows
- Document both in registry

## Installed Skill Registry Format

Maintain `docs/webstudio-skill-registry.md`:

```markdown
# WebStudio Skill Registry

Last updated: <ISO timestamp>

## Installed Skills

| Skill | Purpose | Location | Security Notes | Last Checked |
|-------|---------|----------|----------------|--------------|
| <name> | <purpose> | <path> | <notes> | <date> |

## Custom WebStudio Skills

| Skill | Purpose | Location | Status |
|-------|---------|----------|--------|
| webstudio-skill-curator | Skill discovery/install | workspace/skills/ | ✅ Active |
| webstudio-task-contract-enforcer | Task compliance | workspace/skills/ | ✅ Active |

## ClawHub Skills

| Skill | Purpose | Source | Security Review |
|-------|---------|--------|-----------------|
| <name> | <purpose> | clawhub.ai/<slug> | ✅ Passed / ❌ Rejected |
```

## No Secret Leakage Policy

**NEVER:**
- Paste secrets in skill configs
- Store secrets in SKILL.md
- Commit `.env` files with real values
- Log secret values
- Expose API keys in error messages

**ALWAYS:**
- Use environment variables for secrets
- Redact secrets in logs (`sed -E 's/=.*/=<redacted>/'`)
- Use `.env.example` with placeholder values
- Document required env vars without values
- Use OpenClaw gateway config for sensitive settings

## Skill Curator Workspace

Location: `~/.openclaw/workspace-skill-curator/`

Responsibilities:
- Discover relevant skills for tasks
- Inspect and security-screen candidates
- Install safe/useful skills
- Maintain skill registry
- Run `openclaw skills check` after changes
- Notify Quality Governor for risky skills
