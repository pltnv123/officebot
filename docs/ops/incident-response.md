# Incident Response

## Purpose
This document defines how incidents are handled in this project under long-run autonomous engineering mode.

It is optimized for:
- backend/runtime failures
- queue/watchdog/cron failures
- deploy/recovery incidents
- CI/proof regressions
- blocked-subsystem escalation

It is not a generic corporate incident policy. It is a working incident playbook for this repository and server.

---

## Incident Severity

### SEV-1
Production-critical failure with active user/system impact and no functioning workaround.

Examples:
- ws.service down and verify_ws repeatedly FAIL
- deploy pipeline broken and rollback path unclear
- queue corruption that blocks task execution
- repeated watchdog/cron failures with no recovery

### SEV-2
Serious degradation with limited workaround or partial recovery.

Examples:
- service recovered manually but root cause unknown
- monitoring is green again but status artifact is stale/conflicting
- queue backlog growing unexpectedly
- repeated transient failures requiring manual intervention

### SEV-3
Contained engineering issue with low immediate impact.

Examples:
- one proof gate temporarily flaky
- isolated recovery drill failure
- stale docs/templates/policies not matching system reality

---

## Incident Detection Sources

Primary detection sources:
- logs/cron_monitor_ws.log
- engineering_status.json
- systemctl status ws
- systemctl --user status openclaw-gateway.service
- GitHub Actions runs
- queue health metrics
- watchdog outputs

Reliable signals:
- repeated verify_ws FAIL
- ws.service inactive/dead
- queue backlog surge
- stuck in_progress tasks
- failing deploy/recovery gates
- artifact mismatch / smoke-test failure

---

## Incident Workflow

### 1. Confirm
Do not guess.
Confirm the incident from real evidence.

Required:
- exact failing component
- latest factual logs/status
- current impact scope

### 2. Stabilize
Take the smallest safe recovery action first.

Examples:
- restart ws.service
- rerun cron monitor to verify recovery
- restore healthy backup
- fail stuck tasks via watchdog path
- stop repeated harmful retries

### 3. Verify Recovery
Recovery is not complete until proof exists.

Minimum proof:
- service/process healthy again
- monitor path PASS again
- queue state healthy again
- deploy/recovery gates green again if relevant

### 4. Record
Record:
- trigger
- evidence
- immediate recovery action
- current status
- remaining uncertainty

### 5. Root Cause Follow-up
Do not invent causes.
Only state root cause when evidence supports it.

If cause is unknown, say so explicitly and log strongest available evidence.

---

## Incident Report Template

### Trigger
What exact condition triggered the incident?

### Evidence
What exact log/status/proof confirms it?

### Impacted Layer
Examples:
- backend queue
- ws runtime
- cron monitor
- deploy/recovery
- CI/proof
- blocked Unity layer

### Immediate Recovery Action
What was done first to restore service?

### Recovery Verification
What exact proof shows recovery happened?

### Root Cause
- proven cause
- or strongest evidence available if unproven

### Hardening Follow-up
What smallest safe change should reduce recurrence?

---

## Service-Specific Notes

### ws.service incidents
Check:
- systemctl status ws
- systemctl show ws.service -p Restart,RestartSec,NRestarts,Result,ExecMainCode,ExecMainStatus
- latest cron monitor log entries
- node scripts/verify_ws.js

Typical incident questions:
- Is service dead or flapping?
- Is monitor failing every minute?
- Did auto-restart recover it?
- Did service exit as failure or clean exit?

### Queue incidents
Check:
- node scripts/queue_health.js
- watchdog evidence
- task queue persistence state
- lock timeout/stale lock conditions

Typical incident questions:
- Is backlog growing?
- Are tasks stuck in_progress?
- Are duplicate claims prevented?
- Is corruption/missing file recovery working?

### Deploy/recovery incidents
Check:
- backup hash gate
- restore smoke-test
- /office probe
- ws.service post-deploy state
- latest CI logs

---

## Blocked Sublayer Handling

Current known blocked sublayer:
- Unity WebGL WebSocket bridge inclusion

Rules:
- do not misclassify this as a normal runtime incident if the real blocker is missing build capability
- track it separately
- continue non-blocked recovery work normally

---

## Reporting Discipline

During incident mode:
- concise
- factual
- no speculation
- no decorative status updates

Preferred outputs:
- incident report
- blocker report
- recovery verification report

---

## Exit Criteria

An incident is resolved only when:
- the failing component is healthy again
- recovery is proven, not assumed
- any stale/conflicting status is corrected or explicitly tracked
- next hardening step is identified if recurrence risk remains