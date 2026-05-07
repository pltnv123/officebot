# Backlog State Machine v2

**Version:** 2.0
**Date:** 2026-05-07

## Overview

The backlog state machine provides structured task lifecycle management for autonomous operations.

## Schema

See: `/workspace/autonomy/backlog/schema-v2.yaml`

## Statuses

| Status | Description | Entry Conditions | Exit Conditions |
|--------|-------------|------------------|-----------------|
| `pending` | Task in backlog, not claimed | Task created | Runner selects task |
| `claimed` | Runner has selected task | Runner acquires lease | Runner starts execution |
| `in_progress` | Task being executed | Runner starts work | Completion/failure |
| `ready_for_agent` | Packet created, waiting | Agent execution needed | Agent starts |
| `completed` | Finished successfully | All success criteria met | (terminal) |
| `blocked` | Cannot proceed | Dependency missing | Dependency resolved |
| `approval_required` | Needs human approval | High risk or explicit flag | Approval granted |
| `failed_retryable` | Failed, can retry | Transient error, attempts < max | Retry scheduled |
| `failed_terminal` | Failed permanently | Max attempts exceeded | (terminal) |

## State Transitions

```
pending ──▶ claimed ──▶ in_progress ──▶ completed
                              │
                              ├──▶ ready_for_agent ──▶ in_progress
                              │
                              ├──▶ approval_required ──▶ in_progress
                              │
                              ├──▶ blocked ──▶ pending
                              │
                              ├──▶ failed_retryable ──▶ pending
                              │
                              └──▶ failed_terminal
```

## Lease System

Leases prevent multiple runners from claiming the same task.

**Lease Schema:**
```yaml
task_id: string
owner: string           # runner ID
acquired_at: timestamp
expires_at: timestamp   # 30 min default
status: active|expired|released
```

**Lease Lifecycle:**
1. Runner acquires lease when claiming task
2. Lease expires after 30 minutes (allows recovery)
3. Runner releases lease on completion
4. Stuck leases expire automatically

## Failure Policies

| Policy | Behavior | Use Case |
|--------|----------|----------|
| `retry` | Increment attempts, return to pending | Transient errors |
| `block` | Move to blocked, wait for unblock | Missing dependencies |
| `notify` | Send notification, move to approval_required | Medium risk failures |
| `rollback` | Attempt rollback, then failed_terminal | Critical failures |

## Task Selection Algorithm

```bash
# hautonomy selects first task matching:
1. status: pending
2. requires_approval: false (for autonomous)
3. risk_level: low or medium
4. attempt_count < max_attempts
5. No active lease OR lease expired
```

## Files

- **Schema:** `/workspace/autonomy/backlog/schema-v2.yaml`
- **Backlog:** `/workspace/autonomy/backlog/backlog-v2.yaml`
- **Completed:** `/workspace/autonomy/backlog/completed-v2.yaml`
- **Blocked:** `/workspace/autonomy/backlog/blocked-v2.yaml`
- **Approval Required:** `/workspace/autonomy/backlog/approval-required-v2.yaml`
- **Leases:** `/workspace/autonomy/state/leases.yaml`
