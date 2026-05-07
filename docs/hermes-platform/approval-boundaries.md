# Hermes Approval Boundaries

## Overview

This document defines explicit approval boundaries for Hermes autonomous operations.

## Explicit Approval Required

### Code and Workflow Changes
- Source code changes (any `src/`, `*.py`, `*.js`, etc.)
- Workflow changes (`.github/workflows/*.yml`)
- Package/dependency changes (`package.json`, `requirements.txt`, etc.)
- Configuration changes (`.env`, `config.yaml`, etc.)

### Runtime and State
- Runtime state changes (services, processes, daemons)
- Database changes (Supabase SQL execution)
- File deletion (`rm`, `git rm`)
- File movement (`mv`, `git mv`)
- Build artifact changes
- Screenshots/evidence movement

### GitHub Operations
- GitHub Releases
- Issue creation
- CI/CD workflow implementation PRs
- Deployment changes
- Force push (`git push -f`)
- Direct push to main/master

### Heavy Compute
- `qmd query` (GPU/LLM heavy)
- `qmd vsearch` (vector search, GPU heavy)
- `qmd embed` (embedding generation, GPU heavy)

## Allowed Autonomously

### Documentation
- Docs-only PRs (under `docs/`, `runbooks/`, `templates/`)
- AGENTS.md improvements
- Runbook updates

### Audits and Reports
- Read-only audits
- Local reports under `/output`
- Patch packages under `/output` (not applied)

### Knowledge Management
- QMD safe mode: update/search/get/ls
- Local skills creation/update
- Multi-agent delegation for planning/review/audit

### Operations
- hfinalize execution
- Snapshot requests
- Cron/watchdog health checks

## Approval Text Format

To approve a task, reply with exact text:
```
APPROVE <task-id> — <brief description>
```

Example:
```
APPROVE build-artifact-migration-004 — docs-only proposal for Build structure migration
```

## Approval Packet

For complex approvals, Hermes creates an approval packet containing:
- Task description
- Allowed scope
- Forbidden scope
- Risk assessment
- Rollback plan
- Expected outputs

See `/workspace/autonomy/templates/approval-packet-template.md`.

## Destructive Action Policy

Destructive actions require:
1. Separate explicit approval
2. Documented rollback plan
3. Backup/snapshot before execution
4. Exact scope definition
5. Post-execution verification
6. Final answer reporting

## Escalation

If approval is unclear or missing:
- Move task to `approval-required.yaml`
- Create approval packet
- Report NEEDS_APPROVAL in final answer
