# Post-Mortem

## Purpose
This template is used after meaningful failures, outages, recovery incidents, or proof-gate regressions.

It is intended for:
- runtime outages
- queue failures
- monitor failures
- deploy/recovery incidents
- repeated autonomous execution mistakes

Use it after recovery is complete.

---

## Summary

### Incident Title
Short, factual title.

### Date/Time Window
UTC timestamps.

### Severity
SEV-1 / SEV-2 / SEV-3

### Impacted Layer
Examples:
- ws runtime
- queue/watchdog
- cron monitor
- deploy/recovery
- CI/proof
- blocked Unity layer

### Outcome
Recovered / partially recovered / unresolved

---

## What Happened
Describe the sequence factually.

Include:
- trigger
- first visible evidence
- actions taken
- recovery confirmation

Do not include speculation here.

---

## User/System Impact
State actual impact clearly.

Examples:
- service unavailable
- monitor failed repeatedly
- queue processing blocked
- deploy halted
- live UI proof blocked

---

## Detection
How was the incident detected?

Examples:
- cron FAIL
- systemd status
- CI red run
- queue health metric
- manual audit

Was detection timely?
- yes / no / partially

---

## Recovery
What exact actions restored service?

Examples:
- restart ws.service
- restore backup
- clear stale lock
- fix restart policy
- rerun verify path

What proof confirmed recovery?

---

## Root Cause
### Proven Root Cause
If known, state it.

### If Root Cause Is Not Proven
State strongest evidence available and keep cause marked unknown.

Never guess.

---

## Why Existing Safeguards Did or Did Not Help
Examples:
- cron monitor detected the issue
- watchdog recovered stuck tasks
- restart policy did not cover clean exit
- engineering_status stayed stale
- smoke-test blocked a bad deploy

---

## What Worked Well
List concrete strengths observed.

Examples:
- backup gate caught corruption
- watchdog failed stuck tasks correctly
- queue recovered without manual cleanup

---

## What Failed or Was Weak
List concrete weaknesses.

Examples:
- status artifact stale/conflicting
- service did not self-heal
- audit path unreliable in agent environment
- weak reporting cadence during incident

---

## Hardening Actions
List the smallest safe follow-ups.

For each:
- action
- owner (autonomous tech lead / manual / external)
- priority- proof required

---

## Prevention Notes
What should make recurrence less likely?

Examples:
- Restart=always
- remove stale status fields
- strengthen proof gates
- reduce ambiguous state representations

---

## Follow-up Classification
- adopt now
- adapt later
- blocked by external capability
- no action required

---

## Closure Criteria
This post-mortem is closed when:
- all agreed hardening actions are completed or explicitly blocked
- unresolved uncertainty is documented
- no false “fixed” claim remains