# Safe Agent Execution Bridge

**Version:** 2.0
**Date:** 2026-05-07

## Overview

The agent execution bridge defines safe pathways for autonomous agent work while maintaining strict approval boundaries.

## Execution Modes

### Autonomous (No Approval Required)

| Mode | Description | Constraints |
|------|-------------|-------------|
| `docs_only_pr` | Create and merge docs PR | docs/ directory only, no source |
| `read_only_audit` | Inspect and report | No writes, read-only |
| `report_only` | Generate analysis | Output to /output only |
| `approval_request` | Create approval packet | No execution, just request |

### Approval Required

| Mode | Description | Approval Scope |
|------|-------------|----------------|
| `script_only` | Run safe embedded script | Commands, files, rollback |
| `agent_prompt` | Invoke agent execution | Full task scope |

## Safety Layers

### Layer 1: Execution Mode Classification

```yaml
# Task definition
execution_mode: docs_only_pr  # Determines autonomy level
risk_level: low               # Additional gating
requires_approval: false      # Explicit override
```

### Layer 2: Scope Boundaries

```yaml
# Allowed paths
allowed_scope: [docs/hermes-platform/]

# Forbidden paths
forbidden_scope: [src/, .github/workflows/, supabase/]
```

### Layer 3: GitHub Write Guard

**Before any GitHub write:**
1. Verify `github_write_allowed: true`
2. Verify `merge_allowed: true` (for autonomous merge)
3. Verify scope is docs-only
4. Run `gh auth status`
5. Check branch doesn't collide
6. Verify PR diff is within allowed scope
7. Check CI status (if applicable)

### Layer 4: Approval Inbox

High-risk operations routed through approval inbox:
- `happrovals list` shows pending
- Human reviews and approves/rejects
- Approved requests moved to `approved/`
- hautonomy processes on next run

### Layer 5: Lease System

Prevents concurrent execution:
- Acquire lease before claiming task
- Lease expires after 30 minutes
- Prevents stuck tasks from blocking backlog

### Layer 6: Watchdog Monitoring

Continuous health checks:
- Run age monitoring
- Failure tracking
- System resource alerts

## Agent Invocation Patterns

### Pattern A: Packet-Only (Current Default)

```
hautonomy → Create run packet → Human reviews → Human triggers agent
```

**Safety:** Maximum - human always in loop

### Pattern B: Autonomous Docs-Only

```
hautonomy → Verify docs-only → Create branch → Commit → PR → Merge
```

**Safety:** High - constrained scope, reversible

### Pattern C: Approval-Gated Script

```
hautonomy → Create approval request → Human approves → Run script → Report
```

**Safety:** Medium - human approves before execution

### Pattern D: Full Agent (Future)

```
hautonomy → Invoke agent with bounded context → Monitor → Report
```

**Safety:** Requires explicit approval - not enabled by default

## Forbidden Actions (Hard Blocks)

These actions are NEVER autonomous:

- Source code changes (non-docs)
- Workflow modifications
- Database writes (Supabase)
- File deletion
- git rm --cached
- Force push
- Direct main/master push
- Secret/token exposure
- qmd query/vsearch/embed (without approval)
- Destructive commands

## Verification Checklist

Before autonomous execution:

- [ ] Execution mode allows autonomy
- [ ] Risk level is low/medium
- [ ] `requires_approval: false`
- [ ] `allowed_scope` verified
- [ ] `forbidden_scope` respected
- [ ] GitHub write guard passed (if applicable)
- [ ] No active lease conflict
- [ ] Watchdog status OK

## Rollback Procedures

### Docs-Only PR Rollback

```bash
# Revert merged PR
gh pr revert <PR-number>

# Or delete merged branch
git push origin --delete <branch>
```

### Script Execution Rollback

```bash
# Defined in task's rollback_plan
# Example: restore from backup
cp /path/to/backup /path/to/restore
```

## Files

| File | Purpose |
|------|---------|
| `/workspace/autonomy/backlog/schema-v2.yaml` | Execution mode definitions |
| `/workspace/autonomy/approvals/` | Approval inbox |
| `/workspace/autonomy/policies/autonomy-boundaries.md` | Boundary policy |
