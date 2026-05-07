# Autonomy Watchdog

**Version:** 2.0
**Date:** 2026-05-07

## Overview

The autonomy watchdog monitors system health and alerts on anomalies every 15 minutes.

## Schedule

**Cron:** `*/15 * * * *`
**Path:** `/workspace/bin/hautonomy-watchdog`

## Health Checks

| Check | Warning Threshold | Critical Threshold |
|-------|-------------------|-------------------|
| Last run age | >45 minutes | >90 minutes |
| Last run status | Not SUCCESS | N/A |
| Consecutive failures | >2 | >5 |
| QMD health | update fail | N/A |
| hfinalize reports | None found | N/A |
| Snapshot backlog | >5 pending | >10 pending |
| Disk usage | >85% | >95% |

## Status File

**Path:** `/workspace/runtime/autonomy-watchdog-status.txt`

**Format:**
```ini
timestamp=2026-05-07T16:50:36+00:00
status=OK
last_run_status=SUCCESS
last_run_age_minutes=15
consecutive_failures=0
qmd_status=OK
hfinalize_reports=34
snapshot_backlog=1
disk_usage_percent=34
pending_approvals=0
pending_tasks=36
```

## Report

**Path:** `/output/autonomy-watchdog-report.md`

**Contents:**
- Health check table
- Issue list (if any)
- Status file path

## Log

**Path:** `/workspace/runtime/autonomy-watchdog.log`

**Format:**
```
2026-05-07T16:50:36+00:00 OK
2026-05-07T17:05:36+00:00 OK
2026-05-07T17:20:36+00:00 WARNING
```

Log rotated to last 100 lines.

## Alert Conditions

### WARNING

- Last run >45 minutes ago
- Last run status not SUCCESS
- Consecutive failures >2
- QMD update fails
- No hfinalize reports
- Snapshot backlog >5
- Disk usage >85%

### Escalation

If watchdog reports WARNING for 3 consecutive checks (>45 minutes):
1. Check runner logs: `/workspace/runtime/autonomy-runner.log`
2. Check last run status: `cat /workspace/runtime/last-autonomy-run.txt`
3. Check hautonomy: `/workspace/bin/hautonomy --dry-run`
4. Review watchdog report: `/output/autonomy-watchdog-report.md`

## Commands

```bash
# Run manual check
hautonomy-watchdog

# View status
cat /workspace/runtime/autonomy-watchdog-status.txt

# View report
cat /output/autonomy-watchdog-report.md

# View log
tail -f /workspace/runtime/autonomy-watchdog.log
```

## Installation

```bash
# Run installer on host
bash /home/hermes/.hermes/cache/documents/install-autonomy-watchdog.sh
```

## Disable

```bash
# Edit crontab
crontab -e

# Comment out watchdog line
# */15 * * * * /home/hermes/workspace/bin/hautonomy-watchdog
```

## Files

| File | Purpose |
|------|---------|
| `/workspace/bin/hautonomy-watchdog` | Watchdog script |
| `/workspace/runtime/autonomy-watchdog-status.txt` | Current status |
| `/workspace/runtime/autonomy-watchdog.log` | Run log |
| `/output/autonomy-watchdog-report.md` | Human-readable report |
| `/output/install-autonomy-watchdog.sh` | Host installer |
