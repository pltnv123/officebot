# Hermes Autonomous Backlog System

## Overview

The backlog system manages autonomous task execution for Hermes Web Studio.

## Structure

```
/workspace/autonomy/backlog/
├── backlog.yaml           # Pending tasks
├── completed.yaml         # Completed tasks
├── blocked.yaml           # Blocked tasks
└── approval-required.yaml # Awaiting approval
```

## Task Schema

```yaml
id: <unique-id>
title: <one-line description>
type: <audit|docs|proposal|workflow-minimal|review|maintenance>
status: <pending|in_progress|completed|blocked>
risk_level: <low|medium|high>
allowed_scope: [list of allowed files/paths/actions]
forbidden_scope: [list of forbidden files/paths/actions]
requires_approval: <true|false>
dependencies: [list of task IDs]
recommended_agent_roles: [list of roles]
expected_outputs: [list of output files]
github_write_allowed: <true|false>
merge_allowed: <true|false>
hfinalize_required: true
created_at: <ISO timestamp>
last_attempt_at: <ISO timestamp or null>
notes: <free text>
```

## Task Selection Algorithm

1. Filter backlog.yaml for tasks where:
   - `status: pending`
   - `risk_level: low` or `medium`
   - `requires_approval: false`
   - All `dependencies` are satisfied (in completed.yaml)
2. Select first matching task (priority by order)
3. Update status to `in_progress`
4. Execute within allowed scope
5. On completion:
   - Success: move to `completed.yaml`
   - Blocked: move to `blocked.yaml` with reason
   - Needs approval: move to `approval-required.yaml`

## Current Backlog (20 Safe Tasks)

### CI/CD Continuation
- `cicd-diagnostics-001` — CI/CD diagnostics PR
- `workflow-robustness-002` — Workflow robustness proposal

### Audits
- `runtime-manual-review-003` — Runtime state audit
- `skills-audit-011` — Local skills audit
- `hfinalize-health-014` — hfinalize health audit
- `cron-watchdog-015` — Cron/watchdog health audit

### Documentation
- `evidence-governance-005` — Visual evidence governance
- `webstudio-template-009` — Web studio template build
- `multi-client-intake-010` — Multi-client intake improvement
- `officebot-roadmap-016` — Officebot roadmap update
- `architecture-refinement-017` — Architecture refinement
- `release-checklist-018` — Release checklist docs

### Knowledge Management
- `qmd-index-maintenance-012` — QMD index maintenance
- `github-pr-history-013` — GitHub PR history index

### Proposals (Approval Required)
- `build-artifact-migration-004` — Build artifact migration
- `regression-test-harness-007` — Regression test harness
- `supabase-control-plane-008` — Supabase control-plane review

### Meta
- `approval-packet-019` — Approval packet template
- `self-improvement-retro-020` — Self-improvement retrospective
- `security-redacted-triage-006` — Security triage test

## Dashboard

See `/output/autonomy-safe-backlog.md` for current summary.
