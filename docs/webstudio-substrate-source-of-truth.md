# WebStudio Substrate Source of Truth

## Overview

This document defines the authoritative source of truth for each type of claim in WebStudio development.

## Source of Truth Matrix

| Source | Role | When Required | How to Verify | What Not to Claim Without Proof |
|--------|------|---------------|---------------|--------------------------------|
| **Latest user instruction** | Immediate intent, overrides prior state | Always — start here | Read current message | Do not assume intent from old messages |
| **Task Contract** | Formal requirements for milestone | Every milestone | Check docs/acceptance/ or session | Do not start implementation without contract |
| **Runtime/browser/test evidence** | Live proof of behavior | UI changes, bug fixes, feature claims | curl, browser test, smoke test output | Do not claim "works" with curl-only for UI |
| **Supabase** | Durable runtime state | Workflow/project/operator state | `env \| grep SUPABASE` (redacted) | Do not claim artifact/run state without Supabase proof |
| **Git committed code/docs** | Implementation source of truth | All code/docs changes | `git log`, `git status`, file inspection | Do not claim code exists without git proof |
| **Workspace brain files** | Agent instructions | Agent behavior, role boundaries | File inspection (SOUL, AGENTS, etc.) | Do not claim agent capability without brain file |
| **QWD/QMD** | Retrieval knowledge | Architecture, decisions, constraints | `find ... \| grep qwd\|qmd` | Do not claim decision without QWD/QMD or docs proof |
| **lossless-claw** | Memory continuity | Prior milestones, session history | `/lossless`, `lcm_grep`, `lcm_expand_query` | Do not claim continuity without lossless proof |
| **Skills** | Reusable procedures | Standardized workflows | `openclaw skills list`, file inspection | Do not claim skill exists without proof |
| **Model recall** | Last resort | When no substrate available | N/A — not authoritative | Do not use as source of truth when substrate exists |

## Detailed Source Definitions

### 1. Latest User Instruction

**Role:** Immediate intent that overrides all prior state.

**When Required:** Always — every task starts here.

**How to Verify:**
- Read current user message
- Check for explicit instructions
- Identify implicit requirements

**What Not to Claim Without Proof:**
- Do not assume intent from old messages
- Do not continue old milestone without explicit request

### 2. Task Contract

**Role:** Formal requirements, acceptance criteria, proof requirements.

**When Required:** Every milestone before implementation.

**How to Verify:**
- Check `docs/acceptance/<task>-contract.md`
- Check session for contract creation
- Verify checklist present

**What Not to Claim Without Proof:**
- Do not start implementation without contract
- Do not claim COMPLETE without contract checklist

### 3. Runtime/Browser/Test Evidence

**Role:** Live proof of actual behavior.

**When Required:**
- UI/frontend changes
- Bug fix claims
- Feature functionality claims
- Server health claims

**How to Verify:**
```bash
# Server health
curl -I --max-time 5 http://127.0.0.1:8787/webstudio/demo

# Browser test (manual)
Open in browser, verify flow, check console

# Smoke tests
node scripts/webstudio-<feature>-smoke.js
```

**What Not to Claim Without Proof:**
- Do not claim UI works with curl-only
- Do not claim bug fixed without browser proof
- Do not claim server healthy without health check

### 4. Supabase

**Role:** Durable runtime state for workflows, projects, operators, artifacts.

**When Required:**
- Task touches workflow/project/operator state
- Task depends on artifact run history
- Task modifies project state
- Task reads operator decisions

**How to Verify:**
```bash
env | grep -Ei "SUPABASE" | sed -E 's/=.*/=<redacted>/' || echo "No SUPABASE env vars"
```

**What Not to Claim Without Proof:**
- Do not claim Supabase state is correct without checking
- Do not claim artifact exists without Supabase/git proof
- Do not claim run history exists without Supabase proof
- Do not print actual secret values

### 5. Git Committed Code/Docs

**Role:** Source of truth for implementation and documentation.

**When Required:**
- All code changes
- All doc changes
- Architecture decisions
- Policy definitions

**How to Verify:**
```bash
git status --short
git log --oneline -8
ls -la docs/
```

**What Not to Claim Without Proof:**
- Do not claim code exists without git proof
- Do not claim doc updated without git proof
- Do not use `git add .` — explicit files only

### 6. Workspace Brain Files

**Role:** Agent instructions, role boundaries, operating policies.

**When Required:**
- Agent behavior questions
- Role boundary clarification
- Operating policy reference

**How to Verify:**
```bash
ls /home/antonbot/.openclaw/workspace/SOUL.md
ls /home/antonbot/.openclaw/workspace/AGENTS.md
# etc.
```

**What Not to Claim Without Proof:**
- Do not claim agent capability without brain file
- Do not claim role boundary without SOUL.md proof

### 7. QWD/QMD

**Role:** Retrieval knowledge: architecture, decisions, constraints, accepted state.

**When Required:**
- Task depends on architecture/history
- Task references prior decisions
- Task needs constraints/accepted state

**How to Verify:**
```bash
find /home/antonbot/.openclaw -maxdepth 6 -type f -o -type d | grep -Ei "qwd|qmd" | head -160 || true
```

**What Not to Claim Without Proof:**
- Do not claim QWD/QMD retrieval was used without evidence
- Do not claim architecture decision without QWD/QMD or docs proof

### 8. lossless-claw

**Role:** Memory continuity: session history, milestone recovery, stale context prevention.

**When Required:**
- Task depends on previous milestone/context
- Task needs to avoid stale reports
- Task references prior conversation decisions

**How to Verify:**
```bash
/lossless
lcm_grep(query: "...", mode: "full_text")
lcm_expand_query(query: "...", prompt: "...")
```

**What Not to Claim Without Proof:**
- Do not claim lossless memory was consulted without evidence
- Do not claim milestone continuity without lossless proof
- Do not trust stale summaries over fresh evidence

### 9. Skills

**Role:** Reusable procedures and capabilities.

**When Required:**
- Task may benefit from existing capabilities
- Task needs standardized procedure
- Task requires security/review gate

**How to Verify:**
```bash
openclaw skills list || true
openclaw skills list --eligible || true
openclaw skills check || true
find /home/antonbot/.openclaw/workspace/skills -name "SKILL.md" | sort
```

**What Not to Claim Without Proof:**
- Do not claim skill exists without filesystem/command proof
- Do not claim skill was used without evidence
- Do not install third-party skills without inspection

### 10. Model Recall

**Role:** Last resort when no substrate available.

**When Required:**
- When all other sources unavailable
- For general knowledge questions

**How to Verify:**
- N/A — not authoritative

**What Not to Claim Without Proof:**
- Do not use as source of truth when substrate exists
- Do not claim exact values (commands, SHAs, paths, timestamps) from recall
- Do not trust recall over live evidence

## Conflict Resolution

When sources conflict:

1. **Latest user instruction** wins over all prior state
2. **Runtime evidence** wins over claims
3. **Supabase** wins over workspace files for durable state
4. **Git committed** wins over uncommitted changes
5. **QWD/QMD** wins over model recall for decisions
6. **lossless-claw** wins over summaries for session history

## Final Report Requirements

Every final report must include substrate proof section:

```markdown
## BRAIN SUBSTRATE CHECK

| Substrate | Required | Available | Checked | Evidence |
|-----------|----------|-----------|---------|----------|
| Supabase | yes/no | yes/no | yes/no | <command/output> |
| QWD/QMD | yes/no | yes/no | yes/no | <command/output> |
| lossless | yes/no | yes/no | yes/no | <command/output> |
| skills | yes/no | yes/no | yes/no | <command/output> |
| Git | yes/no | yes/no | yes/no | <commit hash> |
| Browser | yes/no | yes/no | yes/no | <URL/screenshot> |

**Fallback Used:** <description or "none">

**Verdict:** ACCEPTED / CONDITIONALLY ACCEPTED / REJECTED / BLOCKED
```

## See Also

- `docs/webstudio-brain-substrate-policy.md`
- `docs/webstudio-task-contract-enforcement.md`
- `skills/webstudio-brain-substrate-check/SKILL.md`
