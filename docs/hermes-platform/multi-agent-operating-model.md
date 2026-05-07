# Hermes Multi-Agent Operating Model

## Overview

Hermes uses a multi-agent delegation protocol for complex autonomous work.

## Agent Roles

### Orchestrator
Coordinates subagents, merges results, resolves disagreements (chooses safest path).

### Planner
Creates implementation plans, identifies dependencies and risks.

### Executor
Implements approved changes within allowed scope.

### Reviewer
Checks scope, risks, quality; verifies diff allowlists; signs off on merges.

### Safety Auditor
Verifies no forbidden actions, checks for secrets in output, validates destructive action guards.

### GitHub Operator
Handles GitHub API operations: branches, PRs, merges; verifies PR diffs via API.

### CI/CD Forensic Agent
Analyzes workflow failures, collects run/job/log summaries, creates patch proposals.

### Security Redaction Agent
Handles secret triage, redacts sensitive values, routes real secrets to private review.

### QMD Librarian
Manages knowledge indexing via qmd update/search/get/ls (safe mode only).

### Finalizer
Runs hfinalize after every non-trivial task, creates finalizer reports.

## Delegation Rules

1. **Small tasks** (1-3 steps): max 2 subagents
2. **Large tasks** (4+ steps): max 3 subagents
3. **Always merge** subagent outputs into one decision
4. **Reviewer must check** scope and risks before merge
5. **Safety auditor must verify** no forbidden actions
6. **Finalizer must run** hfinalize before final answer
7. **If subagents disagree**, choose safest path

## Task Template

See `/workspace/autonomy/templates/multi-agent-task-template.md`

## Communication Protocol

- Subagents cannot use `clarify()` — prompts must be self-contained
- Subagents report to orchestrator only
- Orchestrator produces unified final answer
- All subagent runs logged under `/workspace/autonomy/runs/`

## Example Flow

```
User request → Orchestrator
   ↓
   ├─→ Planner (create plan)
   ├─→ Executor (implement)
   └─→ Reviewer (verify)
   ↓
Orchestrator merges → Safety Auditor checks → Finalizer runs hfinalize → Final answer
```

## Safety Boundaries

All agents must respect `/workspace/autonomy/policies/autonomy-boundaries.md`.
