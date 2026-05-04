# WebStudio Brain Substrate Policy

## Overview

The WebStudio "brain" is **not only** markdown files, workspaces, and skills. It is a multi-layer substrate that includes durable runtime state, retrieval knowledge, and memory continuity.

## Brain Substrate Layers

| Layer | Component | Role |
|-------|-----------|------|
| 1 | Latest user instruction | Immediate intent, overrides prior state |
| 2 | Task Contract | Formalizes requirements, acceptance criteria |
| 3 | Runtime/browser/test evidence | Live proof of behavior |
| 4 | Supabase + /api/state | Durable runtime state + live health probe |
| 5 | Git committed code/docs | Source of truth for implementation |
| 6 | Workspace brain files | SOUL, AGENTS, TOOLS, BOOT, HEARTBEAT, MEMORY |
| 7 | QWD/QMD | Retrieval knowledge: architecture, decisions, constraints |
| 8 | lossless-claw | Memory continuity: session history, milestone recovery |
| 9 | Skills | Reusable procedures and capabilities |
| 10 | Model recall | Last resort, not authoritative |

## Source-of-Truth Hierarchy

When claims conflict, use this hierarchy:

1. **Latest explicit user instruction** — Overrides all prior state
2. **Current Task Contract** — Formal requirements for this milestone
3. **Runtime/browser/test evidence** — Live proof, not curl-only
4. **Supabase durable runtime state** — When task touches workflow/project/operator state
5. **Current code and repo docs** — Committed implementation
6. **Active workspace brain files and skills** — Agent instructions
7. **QWD/QMD retrieved project knowledge** — Architecture, decisions, constraints
8. **lossless-claw continuity/memory** — Session history, prior milestones
9. **Git history** — Historical commits
10. **Model recall** — Not authoritative, verify with substrate

## Supabase Role

**Purpose:** Durable runtime source of truth for:
- Workflow state
- Project/order/artifact state
- Operator decisions
- Audit/history
- Snapshot-safe runtime surfaces

**When Required:**
- Task touches workflow/project/operator durable state
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

## QWD/QMD Role

**Purpose:** Retrieval/project knowledge layer:
- Architecture docs
- Prior decisions
- Constraints
- Accepted state
- Implementation references

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

## lossless-claw Role

**Purpose:** Memory/continuity layer:
- Active milestone recovery
- Stale context prevention
- Long-term project memory
- Session history

**When Required:**
- Task depends on previous milestone/context
- Task needs to avoid stale reports
- Task references prior conversation decisions

**How to Verify:**
```bash
find /home/antonbot/.openclaw -maxdepth 6 -type f -o -type d | grep -Ei "lossless|lossless-claw" | head -160 || true
/lossless
lcm_grep(query: "...", mode: "full_text")
```

**What Not to Claim Without Proof:**
- Do not claim lossless memory was consulted without evidence
- Do not claim milestone continuity without lossless/memory proof

## Skills Role

**Purpose:** Reusable procedures and capabilities:
- Browser proof
- Smoke tests
- Security review
- Release discipline
- Risk classification
- Quality gate
- Skill curation
- Task contract enforcement
- Brain substrate check

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

## Repo Docs Role

**Purpose:** Committed source of truth for code/docs:
- Architecture decisions (ADRs)
- Policy docs
- Acceptance reports
- Research findings

**When Required:**
- Task references architecture
- Task needs policy guidance
- Task produces acceptance evidence

**How to Verify:**
```bash
git log --oneline -8
ls -la docs/
```

**What Not to Claim Without Proof:**
- Do not claim doc exists without git proof
- Do not claim architecture decision without ADR proof

## Runtime/Browser Proof Role

**Purpose:** Live evidence of behavior:
- Server health
- UI functionality
- User flow
- Delivery page behavior

**When Required:**
- Task touches UI/frontend
- Task claims feature works
- Task reports bug fix

**How to Verify:**
```bash
curl -I --max-time 5 http://127.0.0.1:8787/webstudio/demo
# Plus manual browser test for UI changes
```

**What Not to Claim Without Proof:**
- Do not claim UI works with curl-only
- Do not claim bug fixed without browser proof
- Do not claim server healthy without health check

## Mandatory Substrate Checks

| Task Type | Required Substrate |
|-----------|-------------------|
| Workflow/project/operator state | Supabase check |
| Architecture/history dependent | QWD/QMD retrieval |
| Context/milestone continuity | lossless-claw check |
| UI/delivery behavior | Browser/runtime proof |
| Git/release | Release Manager + git discipline |
| Skill-beneficial | Skill discovery |
| Security-sensitive | Security review |

## Final Report Substrate Section

Every final report must include:

```markdown
## BRAIN SUBSTRATE CHECK

- Supabase required: yes/no
- Supabase available: yes/no
- Supabase checked: yes/no
- QWD/QMD required: yes/no
- QWD/QMD available: yes/no
- QWD/QMD checked: yes/no
- lossless required: yes/no
- lossless available: yes/no
- lossless checked: yes/no
- skills required: yes/no
- skills checked: yes/no
- fallback: <description or "none">
- verdict: ACCEPTED / CONDITIONALLY ACCEPTED / REJECTED / BLOCKED
```

## Substrate Unavailability Handling

If substrate is unavailable:

1. **Document unavailability** — State clearly what is not available
2. **Use safe fallback** — Alternative source of truth
3. **Mark limitation** — Note in final report
4. **Do not overclaim** — Do not claim substrate was used when it wasn't

| Substrate | Fallback |
|-----------|----------|
| Supabase | Workspace files + MEMORY.md + git |
| QWD/QMD | docs/ + git history |
| lossless | Session history + memory_search |
| Skills | Custom implementation with security review |

## Quality Governor Enforcement

Quality Governor must reject if:
- Task touched durable state but Supabase was not checked
- Task relied on history but QWD/QMD was not checked
- Task relied on context but lossless was not checked
- Final report claims "brain updated" but only markdown files updated
- Final report omits substrate proof section
- Final report says ACCEPTED while substrate checks are listed as future work

## See Also

- `docs/webstudio-substrate-source-of-truth.md`
- `docs/webstudio-task-contract-enforcement.md`
- `docs/webstudio-quality-governor.md`
- `skills/webstudio-brain-substrate-check/SKILL.md`
