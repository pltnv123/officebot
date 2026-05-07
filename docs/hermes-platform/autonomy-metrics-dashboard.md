# Autonomy Metrics Dashboard

**Version:** 2.0
**Date:** 2026-05-07

## Overview

The metrics dashboard provides visibility into autonomy system performance and backlog status.

## Dashboard Files

| File | Purpose | Location |
|------|---------|----------|
| `autonomy-dashboard.md` | Executive summary | `/workspace/autonomy/reports/` + `/output/` |
| `autonomy-metrics.md` | Detailed metrics | `/workspace/autonomy/reports/` + `/output/` |
| `approval-inbox.md` | Approval status | `/workspace/autonomy/reports/` + `/output/` |
| `backlog-status.md` | Backlog breakdown | `/workspace/autonomy/reports/` + `/output/` |

## Key Metrics

### Run Metrics

```yaml
total_runs: int           # Total cycles executed
successful_runs: int      # SUCCESS status
failed_runs: int          # FAILED status
success_rate: float       # successful / total
```

### Backlog Metrics

```yaml
pending_tasks: int
in_progress_tasks: int
ready_for_agent_tasks: int
approval_required_tasks: int
completed_tasks: int
blocked_tasks: int
```

### Execution Mode Distribution

```yaml
docs_only_pr: int         # Autonomous OK
read_only_audit: int      # Autonomous OK
report_only: int          # Autonomous OK
script_only: int          # Approval required
agent_prompt: int         # Approval required
approval_request: int     # Creates request
```

### Risk Distribution

```yaml
low: int
medium: int
high: int
critical: int
```

### System Health

```yaml
consecutive_failures: int
last_success_at: timestamp
last_failure_at: timestamp
qmd_status: ok|error
hfinalize_status: ok|error
snapshot_status: ok|error|pending
watchdog_status: ok|warning
```

## Throughput Calculations

| Metric | Formula |
|--------|---------|
| Runs per hour | 2 (30-min schedule) |
| Runs per day | 48 |
| Watchdog checks per hour | 4 (15-min schedule) |
| Watchdog checks per day | 96 |
| Backlog clearance (est) | pending_tasks / runs_per_day |

## Capacity Planning

**Example:**
- 36 pending tasks
- 48 runs/day capacity
- Estimated clearance: <1 day (if all autonomous)

**With approval gating:**
- Tasks requiring approval add latency
- Factor in review time for capacity planning

## Dashboard Updates

**Automatic:**
- Updated each autonomy cycle
- Updated each watchdog check

**Manual:**
```bash
# Regenerate dashboard
# (hautonomy updates metrics automatically)
cat /output/autonomy-dashboard.md
```

## Visual Layout

```
╔══════════════════════════════════════════════════════════╗
║              AUTONOMY DASHBOARD                          ║
╠══════════════════════════════════════════════════════════╣
║  System Status                                           ║
║  ┌──────────┬──────────┬──────────┬──────────┐          ║
║  │ Scheduler│ Runner   │ Watchdog │ QMD      │          ║
║  │   ✅     │   ✅     │   ✅     │   ✅     │          ║
║  └──────────┴──────────┴──────────┴──────────┘          ║
╠══════════════════════════════════════════════════════════╣
║  Metrics Summary                                         ║
║  Total Runs: 5    Success: 2    Failed: 3                ║
║  Pending: 36    In Progress: 0    Completed: 0           ║
╠══════════════════════════════════════════════════════════╣
║  Backlog by Category                                     ║
║  CI/CD: 3    Runtime: 3    Security: 2    ...            ║
╠══════════════════════════════════════════════════════════╣
║  Recent Runs                                             ║
║  16:34:59  cicd-diagnostics-001  SUCCESS                 ║
║  16:30:40  cicd-diagnostics-001  SUCCESS                 ║
║  16:30:02  cicd-diagnostics-001  FAILED                  ║
╚══════════════════════════════════════════════════════════╝
```

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Success rate | <80% | <50% |
| Consecutive failures | >2 | >5 |
| Pending approvals | >5 | >10 |
| Backlog age (oldest) | >7 days | >14 days |
| Disk usage | >85% | >95% |

## Files

| File | Purpose |
|------|---------|
| `/workspace/autonomy/reports/autonomy-dashboard.md` | Main dashboard |
| `/workspace/autonomy/reports/autonomy-metrics.md` | Metrics YAML |
| `/workspace/autonomy/reports/approval-inbox.md` | Approval status |
| `/workspace/autonomy/reports/backlog-status.md` | Backlog breakdown |
| `/workspace/autonomy/state/metrics.yaml` | Source of truth |
