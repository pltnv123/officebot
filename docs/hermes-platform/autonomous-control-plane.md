# Hermes Autonomous Control Plane

This document describes the autonomous operating layer for Hermes Web Studio.

## Overview

The autonomous control plane enables Hermes to work for hours safely through:
- Backlog/queue system for task management
- Multi-agent delegation protocol
- Self-improvement loop
- QMD memory indexing
- GitHub docs-only PRs
- Mandatory hfinalize
- Snapshot requests

## Core Principle

**Autonomy is allowed for safe work. Destructive/source/runtime-impact work requires explicit approval**.

## Components

1. **Backlog System** (`/workspace/autonomy/backlog/`)
   - `backlog.yaml` — 20 safe pending tasks
   - `completed.yaml` — completed task records
   - `blocked.yaml` — blocked tasks
   - `approval-required.yaml` — tasks awaiting approval

2. **Policy Files** (`/workspace/autonomy/policies/`)
   - `autonomy-boundaries.md` — allowed/forbidden actions
   - `github-write-policy.md` — docs-only PR protocol
   - `destructive-action-policy.md` — destructive action guards
   - `self-improvement-policy.md` — skill/runbook improvement rules
   - `multi-agent-policy.md` — delegation protocol
   - `finalization-policy.md` — hfinalize requirements

3. **Autonomy Command** (`/workspace/bin/hautonomy`)
   - Runs one bounded autonomous cycle
   - Selects next safe task from backlog
   - Creates run reports under `/output/autonomy-runs/`
   - Runs qmd update and hfinalize

4. **Local Skills** (5 skills under `hermes-ops/`)
   - `autonomy-control-plane`
   - `autonomous-backlog-manager`
   - `docs-only-pr-operator`
   - `qmd-librarian`
   - `autonomous-finalizer`

## Allowed Autonomously

- Read-only audits
- Local reports under `/output`
- QMD safe mode: update/search/get/ls
- Local skills creation/update
- AGENTS.md/runbook improvements
- Docs-only branches/PRs
- Docs-only PR verification and merge (if guards pass)
- Patch packages under `/output`
- Multi-agent delegation for planning/review/audit
- hfinalize execution
- Snapshot requests

## Requires Explicit Approval

- Source code changes
- Workflow changes (CI/CD)
- Package/dependency changes
- Runtime state changes
- git rm --cached
- File deletion or movement
- Build artifact changes
- Supabase SQL execution
- GitHub Releases
- Issue creation
- CI/CD workflow implementation PRs
- Deployment changes

## Strictly Forbidden

- Force push
- Direct push to main/master
- Printing secrets/tokens/env/hosts.yml/credentials
- qmd query/vsearch/embed (GPU-heavy)
- Unbounded infinite loops
- Destructive commands (rm -rf, drop, etc.)
- Silent privilege escalation
- Broad changes without allowlist verification

## Scheduled Runner

Install via host command:
```bash
sudo bash /output/install-hermes-autonomy-runner.sh
```

Runs every 30 minutes, delivering results to Telegram.

## Dashboard Reports

- `/output/autonomy-status.md` — current status
- `/output/autonomy-safe-backlog.md` — safe backlog summary
- `/output/autonomy-approval-required.md` — approval queue
- `/output/autonomy-recent-runs.md` — run history

## Usage

Run one autonomous cycle manually:
```bash
/workspace/bin/hautonomy
```

With dry-run:
```bash
/workspace/bin/hautonomy --dry-run
```

Target specific task:
```bash
/workspace/bin/hautonomy --task cicd-diagnostics-001
```
