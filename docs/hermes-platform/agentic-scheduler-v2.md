# Agentic Scheduler v2 - Operating Model

**Version:** 2.0
**Date:** 2026-05-07
**Status:** Active

## Overview

Agentic Scheduler v2 upgrades Hermes autonomy from "scheduled run-packet generator" to a safer autonomous operating loop with:

- Backlog state machine with proper status transitions
- Approval inbox for human-in-the-loop gating
- Autonomy watchdog for health monitoring
- Run lease/lock system to prevent overlaps
- Metrics dashboard for observability
- Execution mode classification for safe autonomy

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEDULED RUNNER                          │
│              (crontab */30 * * * *)                          │
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │ hautonomy    │────▶│ Task Select  │────▶│ Execution   │  │
│  │ v2           │     │ (v2 backlog) │     │ Mode Router │  │
│  └──────────────┘     └──────────────┘     └─────────────┘  │
│                                              │               │
│                    ┌─────────────────────────┤               │
│                    ▼                         ▼               │
│           ┌──────────────┐          ┌──────────────┐        │
│           │ Autonomous   │          │ Approval     │        │
│           │ Execution    │          │ Required     │        │
│           │ (safe modes) │          │              │        │
│           └──────────────┘          └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    WATCHDOG                                  │
│              (crontab */15 * * * *)                          │
│                                                              │
│  - Last run age check                                        │
│  - Consecutive failure tracking                              │
│  - QMD/hfinalize health                                      │
│  - Snapshot backlog monitoring                               │
│  - Disk usage alerts                                         │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Scheduled Runner

**Path:** `/home/hermes/.hermes/scripts/hermes-autonomy-safe-runner.sh`
**Schedule:** Every 30 minutes (`*/30 * * * *`)

**Features:**
- Lock file prevents overlapping runs
- Path resolution (host + Docker compatible)
- Log rotation (keeps last 1000 lines)
- Status tracking in `last-autonomy-run.txt`

### 2. hautonomy v2

**Path:** `/workspace/bin/hautonomy`

**Upgrades:**
- Reads from `backlog-v2.yaml` with state machine
- Extracts task metadata (title, risk, execution mode)
- Determines autonomous vs approval-required
- Creates enhanced run packets

**Execution Modes:**
| Mode | Autonomous? | Description |
|------|-------------|-------------|
| `docs_only_pr` | ✅ Yes | Create docs-only PR |
| `read_only_audit` | ✅ Yes | Audit/inspect only |
| `report_only` | ✅ Yes | Generate report |
| `approval_request` | ✅ Yes | Create approval packet |
| `script_only` | ⚠️ Approval | Run safe script |
| `agent_prompt` | ❌ No | Agent execution |

### 3. Approval Inbox

**CLI:** `happrovals`
**Directories:**
- `/workspace/autonomy/approvals/pending/`
- `/workspace/autonomy/approvals/approved/`
- `/workspace/autonomy/approvals/rejected/`

**Workflow:**
1. hautonomy creates approval request YAML
2. User reviews with `happrovals list`
3. User moves to approved/rejected
4. hautonomy processes on next run

### 4. Watchdog

**Path:** `/workspace/bin/hautonomy-watchdog`
**Schedule:** Every 15 minutes

**Health Checks:**
- Last run age (>45 min = WARNING)
- Last run status (not SUCCESS = WARNING)
- Consecutive failures (>2 = WARNING)
- QMD update health
- hfinalize reports
- Snapshot backlog
- Disk usage (>85% = WARNING)

### 5. Backlog State Machine

**File:** `/workspace/autonomy/backlog/backlog-v2.yaml`

**Statuses:**
- `pending` → `claimed` → `in_progress` → `completed`
- `in_progress` → `approval_required` → `in_progress`
- `in_progress` → `failed_retryable` → `pending`
- `in_progress` → `failed_terminal`
- `in_progress` → `blocked` → `pending`

**36 Tasks Seeded** across categories:
- CI/CD Follow-up (3)
- Runtime Safety (3)
- Security Triage (2)
- Regression Harness (2)
- QMD Maintenance (2)
- Skills Improvement (2)
- Platform Operations (2)
- Documentation (2)
- And more...

### 6. Metrics Dashboard

**Files:**
- `/workspace/autonomy/reports/autonomy-dashboard.md`
- `/workspace/autonomy/reports/autonomy-metrics.md`
- `/output/autonomy-dashboard.md`

**Metrics:**
- Total/successful/failed runs
- Backlog counts by status
- Execution mode distribution
- Risk distribution
- System health indicators

## Safety Guarantees

### Forbidden Actions (Require Approval)
- Source code changes in officebot
- Workflow changes
- Runtime/build/evidence changes
- Supabase SQL apply
- File deletion
- git rm --cached
- Force push
- Direct main/master push
- Secrets/tokens/env output
- qmd query/vsearch/embed

### Allowed Autonomously
- Local workspace scripts/docs
- Local skills
- /output reports
- QMD safe mode (search, get, ls, update)
- Docs-only GitHub PRs (if verified safe)
- Docs-only PR merge (if checks pass)
- Host-side installer scripts in /output
- Crontab inspection
- Safe local runner tests
- GitHub read-only and docs-only writes

## Verification Commands

```bash
# Check scheduler
crontab -l | grep autonomy

# Check runner status
cat /workspace/runtime/last-autonomy-run.txt

# Check watchdog
hautonomy-watchdog
cat /workspace/runtime/autonomy-watchdog-status.txt

# Check approvals
happrovals list

# Check backlog
cat /workspace/autonomy/backlog/backlog-v2.yaml | head -50

# Check metrics
cat /output/autonomy-dashboard.md
```

## Files

| Component | Path |
|-----------|------|
| Runner | `/home/hermes/.hermes/scripts/hermes-autonomy-safe-runner.sh` |
| hautonomy | `/workspace/bin/hautonomy` |
| Watchdog | `/workspace/bin/hautonomy-watchdog` |
| Approvals CLI | `/workspace/bin/happrovals` |
| Backlog v2 | `/workspace/autonomy/backlog/backlog-v2.yaml` |
| Schema v2 | `/workspace/autonomy/backlog/schema-v2.yaml` |
| Metrics | `/workspace/autonomy/state/metrics.yaml` |
| Leases | `/workspace/autonomy/state/leases.yaml` |

## Installers

| Installer | Purpose |
|-----------|---------|
| `/output/install-autonomy-scheduler.sh` | Installs runner + crontab |
| `/output/install-autonomy-watchdog.sh` | Installs watchdog + crontab |

## Next Steps

1. Run host installers (if not done)
2. Verify crontab entries
3. Enable autonomous execution for safe modes (requires approval)
4. Monitor via watchdog dashboard
