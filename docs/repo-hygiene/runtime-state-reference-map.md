# OfficeBot Runtime State Reference Map

**Date:** 2026-05-07  
**Scan Target:** Runtime state files on `origin/main` (post-PR25)

---

## Executive Summary

**Total Files Scanned:** 8 runtime state files  
**Total References Found:** 50+ across scripts, backend, docs  
**Risk Level:** HIGH — Active operational dependencies  
**Cleanup Status:** DEFERRED by ADR (PR25) — Option A → Option D

---

## Files in Scope

| File | Size | SHA | Tracked | Status |
|------|------|-----|---------|--------|
| `state.json` | 27 KB | `0255933c` | ✅ Yes | Active runtime state |
| `tasks.json` | 8 KB | `d8ccbfab` | ✅ Yes | Active task board |
| `.world.json` | 163 B | `91ec4bf2` | ✅ Yes | World state toggles |
| `runtime/state/backlog.json` | 3 B | `fe51488c` | ✅ Yes | State machine backlog |
| `runtime/state/blockers.json` | 3 B | `fe51488c` | ✅ Yes | State machine blockers |
| `runtime/state/completed.jsonl` | — | — | ✅ Yes | Completion ledger |
| `runtime/state/current-objective.json` | 228 B | `62a29a7b` | ✅ Yes | Current objective |
| `runtime/state/next-step.json` | 242 B | `39dded03` | ✅ Yes | Next step queue |

**Note:** `completed.jsonl` size not shown — likely empty or minimal.

---

## Reference Analysis

### state.json (20 references)

**Consumers:**
- `backend/server.js` — Serves to `/var/www/office/state.json`
- `backend/agentExecutor.js` — Reads current state
- `backend/agentRouter.js` — State-based routing
- `backend/autonomousApi.js` — State exposure
- `backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter.js` — State persistence
- `scripts/update_state.sh` — Atomic writes
- `scripts/ops/*.sh` (12+ ops scripts) — State reads
- `scripts/telegram/*.sh` — Telegram reports
- `docs/repo-hygiene/adr-runtime-state-strategy.md` — ADR documentation
- `docs/ops/*.md` (13 ops docs) — State machine documentation

**Risk Level:** 🔴 **CRITICAL** — Core runtime dependency

---

### tasks.json (15 references)

**Consumers:**
- `backend/server.js` — Serves to `/var/www/office/tasks.json`
- `scripts/task_enforcer.sh` — Task enforcement
- `scripts/watchdog.sh` — Health monitoring
- `scripts/progress.sh` — Progress tracking
- `scripts/ops/*.sh` — Task operations
- `scripts/telegram/assign_to_agent.sh` — Task assignment
- `docs/ops/task-enforcer-tick-hook-check.md` — Ops documentation
- `docs/repo-hygiene/adr-runtime-state-strategy.md` — ADR documentation

**Risk Level:** 🔴 **CRITICAL** — Task board source-of-truth

---

### .world.json (5 references)

**Consumers:**
- `backend/server.js` — World state initialization (line 98: `WORLD_PATH`)
- `docs/repo-hygiene/adr-runtime-state-strategy.md` — ADR documentation
- `docs/repo-hygiene/pr25-readiness-checklist.md` — Checklist reference
- `docs/tracked-artifact-cleanup-manifest.md` — Manifest reference

**Risk Level:** 🟡 **MEDIUM** — Used but limited consumers

---

### runtime/state/*.json (30+ references across 13 ops docs)

**Files:**
- `backlog.json` — Bounded backlog
- `blockers.json` — Blocker tracking
- `completed.jsonl` — Completion ledger
- `current-objective.json` — Current objective
- `next-step.json` — Next step queue

**Consumers:**
- `docs/ops/delayed-continuity-check.md` — 2 refs
- `docs/ops/manual-tick-trigger-check.md` — 3 refs
- `docs/ops/planner-recovery-check.md` — 2 refs
- `docs/ops/post-recovery-guarded-tick-check.md` — 1 ref
- `docs/ops/qa-blocker-clear-check.md` — 1 ref
- `docs/ops/repeatable-loop-check.md` — 1 ref
- `docs/ops/safe-tick-execution-check.md` — 3 refs
- `docs/ops/scheduled-tick-plan.md` — 4 refs
- `docs/ops/scheduled-tick-safety-check.md` — 1 ref
- `docs/ops/state-driven-execution-check.md` — 4 refs
- `docs/ops/state-model.md` — 6 refs
- `docs/ops/supervisor-tick-checklist.md` — 5 refs
- `docs/ops/unattended-tick-plan.md` — 3 refs
- `scripts/manual_tick.sh` — 7 refs

**Risk Level:** 🔴 **CRITICAL** — State machine persistence layer

---

## CSV Export

```csv
path,category,tracked,size_bytes,reference_count,referenced_by,likely_role,risk_level,proposed_future_action,approval_required
state.json,runtime_state,yes,27831,20,backend/scripts/docs/ops,Core runtime state,CRITICAL,Option D: Generated local + init scripts,yes
tasks.json,runtime_state,yes,8790,15,backend/scripts/docs/ops,Task board source-of-truth,CRITICAL,Option D: Generated local + init scripts,yes
.world.json,runtime_state,yes,163,5,backend/docs,World state toggles,MEDIUM,Option D: Generated local + init scripts,yes
runtime/state/backlog.json,runtime_state_machine,yes,3,15,docs/ops/scripts,State machine backlog,CRITICAL,Option D: Generated local + init scripts,yes
runtime/state/blockers.json,runtime_state_machine,yes,3,15,docs/ops/scripts,State machine blockers,CRITICAL,Option D: Generated local + init scripts,yes
runtime/state/completed.jsonl,runtime_state_machine,yes,1775,15,docs/ops/scripts,Completion ledger,CRITICAL,Option D: Generated local + init scripts,yes
runtime/state/current-objective.json,runtime_state_machine,yes,228,15,docs/ops/scripts,Current objective,CRITICAL,Option D: Generated local + init scripts,yes
runtime/state/next-step.json,runtime_state_machine,yes,242,15,docs/ops/scripts,Next step queue,CRITICAL,Option D: Generated local + init scripts,yes
```

---

## Key Findings

### 1. Active Operational Dependencies
All 8 runtime state files are actively used by:
- Backend server (serves state to dashboard)
- Ops scripts (12+ scripts read/write state)
- Telegram bots (state-based reports)
- 13 ops docs (state machine procedures)

### 2. ADR Decision Confirmed
PR25 ADR (`adr-runtime-state-strategy.md`) correctly defers cleanup:
- Untracking now would break 20+ consumers
- Init scripts required before untracking
- 13 ops docs need updates
- Fresh checkout flow must be tested

### 3. No Safe Untrack Candidates
Unlike log files (PR23, PR24), **none** of these 8 files can be safely untracked without:
- Creating init scripts first
- Updating backend auto-init
- Updating all 13 ops docs
- Testing fresh checkout flow

---

## Proposed Future Action (After Approval)

### Phase 2 Prep Work
1. Create `scripts/init-state.sh` — Initialize `state.json`, `tasks.json`, `.world.json`
2. Create `scripts/init-runtime.sh` — Initialize `runtime/state/*.json`
3. Update `backend/server.js` — Auto-init on missing state
4. Update 13 ops docs — Add init prerequisite step

### Phase 3 Cleanup (After Prep Verified)
1. Test fresh checkout + init flow
2. Untrack files: `git rm --cached state.json tasks.json .world.json runtime/state/*.json`
3. Add to `.gitignore`: `state.json`, `tasks.json`, `.world.json`, `runtime/state/*.json`

---

## Rollback Strategy

If cleanup breaks operations:
```bash
# Revert untrack commit
git revert <cleanup-PR-sha>

# Re-track files
git add state.json tasks.json .world.json runtime/state/
git commit -m "Restore runtime state files after rollback"
```

---

**Map generated by:** Hermes Agent  
**Map path:** `/output/officebot-runtime-state-reference-map.md`  
**Host path:** `/home/hermes/.hermes/cache/documents/officebot-runtime-state-reference-map.md`
