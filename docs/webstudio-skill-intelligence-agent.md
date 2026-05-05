# WebStudio Skill Intelligence Agent

## Purpose

The Skill Intelligence agent is a dedicated infrastructure/knowledge agent for the WebStudio multi-agent system. It owns skill discovery, install/update governance, skill registry maintenance, and multi-agent skill routing.

This agent is **not** a product-coding agent. It does not build features. It ensures other agents have the right skills/tools to execute their tasks.

## Agent Identity

| Property | Value |
|----------|-------|
| Agent ID | `skill-intelligence` |
| Workspace | `~/.openclaw/workspace-skill-intelligence/` |
| Role | Autonomous Skill Curator for WebStudio |
| Primary Model | ollama/qwen3.5:cloud |

## Responsibilities

1. **Skill Discovery**
   - Scan installed skills before complex tasks
   - Search ClawHub for missing capabilities
   - Identify skill gaps in task execution

2. **Install/Update Governance**
   - Recommend safe skills for installation
   - Auto-install low-risk workspace skills when policy allows
   - Require approval for risky skills

3. **Skill Registry Maintenance**
   - Track installed skills and versions
   - Record install/update history
   - Document missing requirements

4. **Multi-Agent Skill Routing**
   - Inform other agents which skills to use
   - Prevent unsafe or irrelevant skill installs
   - Provide skill recommendations on request

## How It Scans Skills

The agent runs a daily scan via `scripts/webstudio-skill-intelligence-scan.js`:

```bash
# Manual run
node scripts/webstudio-skill-intelligence-scan.js

# Report location
/tmp/webstudio-demo/skill-intelligence-report.json
```

Scan commands:
- `openclaw skills list --json`
- `openclaw skills list --eligible --json`
- `openclaw skills check --json`
- `openclaw skills search --limit 20 --json`

## Auto-Install Policy

The agent may auto-install skills **only** when ALL conditions are met:

✅ **Allowed (low-risk):**
- Skills from OpenClaw/ClawHub native search
- Match current task need
- No missing critical requirements
- No external secrets required
- No external message/channel access
- No system service modification
- No paid third-party account needed
- No broad filesystem/network powers beyond normal workspace use

❌ **Requires Approval:**
- Channel skills: telegram, slack, discord, whatsapp
- Secrets/API-key skills
- Payment/commercial service skills
- Destructive/system skills
- Skills requiring sudo/root/global packages
- Skills with unknown source or unclear install requirements
- Plugin installs

## How Other Agents Use It

Before a non-trivial task, any agent should:

1. **Run Skill Check:**
   ```bash
   openclaw skills check
   node scripts/webstudio-skill-intelligence-scan.js
   ```

2. **Ask Skill Intelligence:**
   - Is there a missing skill for this task?
   - Should I install a skill before proceeding?
   - What skill is recommended for X?

3. **Follow Policy:**
   - Install safe low-risk skills if needed
   - Request approval for risky skills
   - Record decision in skill registry

## Manual Invocation

```bash
# Full scan
node scripts/webstudio-skill-intelligence-scan.js

# Check skills status
openclaw skills check

# Search ClawHub
openclaw skills search "github automation" --limit 10

# Install a skill (after inspection)
openclaw skills info <slug>
openclaw skills install <slug>

# Update all skills
openclaw skills update --all
```

## Systemd Timer

A daily timer runs the skill scan automatically:

```bash
# Check timer status
systemctl --user status webstudio-skill-intelligence.timer

# Run scan manually
systemctl --user start webstudio-skill-intelligence.service
```

## Files

| File | Purpose |
|------|---------|
| `~/.openclaw/workspace-skill-intelligence/SOUL.md` | Agent persona and rules |
| `~/.openclaw/workspace-skill-intelligence/AGENTS.md` | Agent duties and acceptance rule |
| `~/.openclaw/workspace-skill-intelligence/TOOLS.md` | Allowed and forbidden tools |
| `~/.openclaw/workspace-skill-intelligence/BOOT.md` | Boot checklist |
| `~/.openclaw/workspace-skill-intelligence/HEARTBEAT.md` | Daily maintenance tasks |
| `~/.openclaw/workspace-skill-intelligence/MEMORY.md` | Agent memory |
| `docs/webstudio-skill-registry.md` | Skill registry and history |
| `scripts/webstudio-skill-intelligence-scan.js` | Scan script |

## Quality Gate

No non-trivial task should report **ACCEPTED** unless:
- Skill Check was performed
- Missing skills were identified or ruled out
- Required skills were installed or approval requested
- Decision was recorded in skill registry
- Final report includes **SKILL INTELLIGENCE CHECK** section

### MANDATORY SKILL CHECK RULE

**Skill Intelligence Check is mandatory before ACCEPTED on any non-trivial WebStudio task.**

**Final report must include:**

```markdown
SKILL INTELLIGENCE CHECK:
- skillScanRun: yes/no
- installedSkillsChecked: <count or list>
- eligibleSkillsChecked: <count or list>
- missingRequirements: <count or list>
- clawhubSearched: yes/no
- recommendedSkills: <list or none>
- installedSkills: <list or none>
- approvalRequired: yes/no
- registryUpdated: yes/no
- verdict: PASS / FAIL
```

**ACCEPTED is forbidden if:**
- task needed a skill/tool and it was ignored
- skill scan was skipped on a complex task
- missing requirements were ignored
- risky skill was installed without approval
- final report lacks SKILL INTELLIGENCE CHECK section

See `docs/webstudio-brain-substrate-policy.md` for full substrate requirements.
