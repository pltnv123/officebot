# Approval Review Board — Operating Model

**Version:** 1.0
**Date:** 2026-05-07
**Purpose:** Structured approval review process for autonomous tasks

---

## Overview

The Approval Review Board provides systematic review of pending approval requests (APRs) before autonomous execution. This ensures safety boundaries are enforced while enabling high-value autonomous work.

---

## Review Phases

### Phase 1 — Inventory

**Goal:** Catalog all pending APRs with full details.

**Actions:**
1. Run `happrovals list`
2. Read each APR file from `/workspace/autonomy/approvals/pending/`
3. Create inventory report with summary table
4. Create CSV with all APR metadata

**Outputs:**
- `/output/approval-review-phase-1-inventory.md`
- `/output/approval-review-pending-requests.csv`

---

### Phase 2 — Risk Classification

**Goal:** Classify each APR by risk level and recommend decision.

**Risk Categories:**
| Category | Definition | Examples |
|----------|------------|----------|
| LOW | Docs-only, report-only, read-only, reversible config | Log inspection, API reads, QMD index |
| MEDIUM | Skills/runbook creation, local ops | New automation skills, scan tools |
| HIGH | Workflow/source/config changes | CI/CD edits, source modifications |
| CRITICAL | Secrets/Supabase/destructive/release | Database writes, force push, releases |

**Actions:**
1. Classify each APR (LOW/MEDIUM/HIGH/CRITICAL)
2. Summarize requested action
3. List exact files/commands
4. State blast radius
5. Document rollback plan
6. Document verification plan
7. Recommend decision (APPROVE/DEFER/REJECT/NARROW)

**Outputs:**
- `/output/approval-review-phase-2-risk-classification.md`
- `/output/approval-review-risk-matrix.csv`

---

### Phase 3 — Execution Order

**Goal:** Recommend safe execution sequence.

**Prioritization Criteria:**
1. Lowest risk first
2. Highest leverage
3. Most reversible
4. Narrowest scope
5. Clearest verification

**Actions:**
1. Rank APRs by priority
2. Document "why now / why not now" for each
3. List prerequisites
4. Specify expected PR type
5. Define expected checks
6. Document rollback for each

**Outputs:**
- `/output/approval-review-phase-3-execution-order.md`

---

### Phase 4 — Approval Prompts

**Goal:** Generate ready-to-send approval prompts for owner.

**Each Prompt Must Include:**
- APPROVED LIMITED SCOPE header
- Exact repo, branch, files, commands
- Allowed scope (✅ checklist)
- Forbidden scope (❌ checklist)
- Diff guards (what changes expected)
- Verification criteria
- Merge policy
- hfinalize requirement
- STOP conditions
- Owner reply template

**Outputs:**
- `/output/approval-prompts/APR-XXX-approval-prompt.md` (one per APR)

---

### Phase 5 — Owner Decision Board

**Goal:** Provide owner with clear decision framework.

**Contents:**
- Executive summary table
- Recommended first approval
- Approvals to defer
- Approvals to reject/narrow
- Exact next message owner should send
- Execution timeline
- Links to all review reports

**Outputs:**
- `/output/approval-review-owner-decision-board.md`

---

## Approval Request Structure

Each APR file in `/workspace/autonomy/approvals/pending/` must include:

```markdown
# Approval Request APR-XXX

**Task ID:** <task-id>
**Created:** <timestamp>
**Status:** Pending

## Requested Action
<What will be done>

## Risk Level
<LOW|MEDIUM|HIGH|CRITICAL>

## Commands Requested
<Exact commands>

## Allowed Scope
<What is permitted>

## Forbidden Scope
<What is not permitted>

## Rollback Plan
<How to undo if needed>

## Verification Plan
<How to verify success>

## Approval Required Because
<Why this needs approval>

## Recommended Decision
<APPROVE|APPROVE WITH CONDITIONS|DEFER|REJECT>
```

---

## Safety Rules

### Forbidden Without Explicit Approval

- Source code changes
- Workflow changes
- Runtime/state/log changes
- Build artifact changes
- Evidence/screenshot/b64 moves
- Supabase writes
- Git rm --cached
- File deletion
- GitHub Releases
- Artifact uploads
- Issue creation
- Force push
- Direct push to main/master
- Secrets/tokens/env/hosts.yml/credential output
- qmd query/vsearch/embed

### Allowed Autonomously

- Read-only audits
- Report-only tasks
- QMD maintenance (safe mode)
- Docs-only PRs
- Docs-only PR verification
- Docs-only PR merge if guards pass
- hfinalize
- Metrics/state/backlog updates
- Approval request generation

---

## Decision Framework

### APPROVE

Use when:
- Risk is LOW
- Scope is narrow and well-defined
- Rollback plan exists
- Verification plan is clear
- No conditions needed

### APPROVE WITH CONDITIONS

Use when:
- Risk is MEDIUM
- Value justifies risk
- Specific conditions mitigate risk
- Owner must acknowledge conditions

Example conditions:
- All findings must be redacted
- No external uploads
- Report-only mode (no remediation)
- Owner reviews first output

### DEFER

Use when:
- Risk is HIGH but task is valuable
- More information needed
- Prerequisites not met
- Better timing expected

### REJECT

Use when:
- Risk outweighs value
- Scope too broad
- Safety measures insufficient
- Alternative approach preferred

---

## Execution After Approval

Once owner approves:

1. **Move APR** — From `pending/` to `approved/`
2. **Execute Task** — Follow approved scope exactly
3. **Verify** — Run verification plan
4. **Report** — Create output report
5. **hfinalize** — Run finalization
6. **Update State** — Mark task completed in backlog
7. **Update Metrics** — Refresh dashboard

---

## Related Documents

| Document | Path |
|----------|------|
| Approval Inbox Protocol | `docs/hermes-platform/approval-inbox.md` |
| Backlog State Machine | `docs/hermes-platform/backlog-state-machine.md` |
| Safe Agent Execution Bridge | `docs/hermes-platform/safe-agent-execution-bridge.md` |
| Agentic Scheduler V2 | `docs/hermes-platform/agentic-scheduler-v2.md` |

---

## Maintenance

**Last Updated:** 2026-05-07
**Review Frequency:** After each approval batch or monthly
