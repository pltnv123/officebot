# Release Checklist

## Purpose
This checklist defines the minimum release discipline for this project.

It applies to:
- deploy workflow changes
- runtime-affecting backend changes
- monitoring/recovery changes
- queue/watchdog/cron changes
- any release that can affect ws runtime, deploy gates, or reliability contour

---

## Pre-Release Checks

### Source State
- [ ] Working tree clean
- [ ] Intended changes committed
- [ ] No accidental runtime artifacts staged
- [ ] Branch/commit identified

### Scope
- [ ] Change scope is understood
- [ ] Blocked Unity bridge work not mixed into unrelated release unless explicitly intended
- [ ] No unnecessary unrelated changes included

### Risk
- [ ] Highest-risk component identified
- [ ] Recovery path known
- [ ] Rollback path known

---

## Reliability Checks

### Queue / Backend
- [ ] Queue state handling still valid
- [ ] Duplicate prevention not regressed
- [ ] Stuck-task watchdog not regressed
- [ ] Lock/liveness protections not regressed

### Monitor / Runtime
- [ ] verify_ws still passes locally or in target environment
- [ ] cron monitor path still valid
- [ ] ws.service recovery behavior still valid
- [ ] engineering_status.json consistency not worsened

---

## Deploy / Recovery Gates

### Backup
- [ ] Backup created
- [ ] Backup hash comparison works
- [ ] Corruption/mismatch gate still blocks bad state

### Restore
- [ ] Restore smoke-test passes
- [ ] Restored archive contains required build files
- [ ] Cleanup after smoke-test succeeds

### Post-Deploy
- [ ] /office verification runs
- [ ] ws.service post-deploy check runs
- [ ] monitor path green after deploy if applicable

---

## CI / Proof
- [ ] Relevant workflow run completed
- [ ] No red CI ignored
- [ ] Required proof captured
- [ ] Screenshot sent to Telegram for deploy/live-verification tasks

---

## Release Decision
- [ ] Safe to release
- [ ] Blocked
- [ ] Requires rollback
- [ ] Requires hotfix

State reason explicitly.

---

## Rollback Readiness
- [ ] Backup path known
- [ ] Restore command/path known
- [ ] Rollback smoke path known
- [ ] No ambiguity about which artifact is authoritative

---

## Release Notes (Minimal)
Record:
- what changed
- why released
- biggest risk
- proof of success
- rollback path if needed

---

## Do Not Release If
- monitor path is red without explanation
- ws runtime unhealthy
- backup/restore proof is broken
- status artifact is actively misleading
- CI failure affects the changed surface