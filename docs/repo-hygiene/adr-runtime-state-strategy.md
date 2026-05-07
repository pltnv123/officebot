# ADR: Runtime State Strategy

**Date:** 2026-05-07  
**Status:** Proposed  
**Deciders:** OfficeBot Maintainer  
**Context:** Post PR #24 merge, pre-PR #25 cleanup

---

## Summary

This ADR defines the persistence strategy for core runtime state files currently tracked in the OfficeBot repository.

**Files in scope:**
- `state.json` (27,831 B)
- `tasks.json` (8,790 B)
- `.world.json` (163 B)
- `runtime/state/backlog.json` (3 B)
- `runtime/state/blockers.json` (3 B)
- `runtime/state/completed.jsonl` (1,775 B)
- `runtime/state/current-objective.json` (228 B)
- `runtime/state/next-step.json` (242 B)
- `engineering_status.json` (not found — may be deprecated)

---

## Current Usage

### state.json
**Readers:**
- `scripts/update_state.sh` (lines 10–14, 347–348)
- `backend/server.js` (serves to `/var/www/office/state.json`)
- `scripts/ops/*.sh` (12+ ops scripts)
- `scripts/telegram/*.sh` (Telegram reports)

**Writers:**
- `scripts/update_state.sh` (atomic write)
- Manual operator edits

**Purpose:** Core runtime state — tracks active steps, gateway status, CPU load, mode, timestamps. Served to dashboard.

### tasks.json
**Readers:**
- `scripts/update_state.sh`
- `backend/server.js` (serves to `/var/www/office/tasks.json`)
- `scripts/task_enforcer.sh`
- `scripts/watchdog.sh`
- `scripts/progress.sh`
- 8+ additional scripts

**Writers:**
- Manual operator edits (primary)
- `scripts/update_state.sh` (backup only)

**Purpose:** Source-of-truth for task board — defines tasks, assignees, estimates, progress, subtasks.

### .world.json
**Readers:**
- `backend/server.js` (line 98: `WORLD_PATH`)

**Purpose:** World state initialization — toggles for lights, doors, metrics.

### runtime/state/*.json
**Readers:**
- 13 ops docs reference these files as state machine components
- `docs/ops/state-driven-execution-check.md`
- `docs/ops/supervisor-tick-checklist.md`
- `docs/ops/safe-tick-execution-check.md`
- `docs/ops/manual-tick-trigger-check.md`
- `docs/ops/delayed-continuity-check.md`
- `docs/ops/planner-recovery-check.md`
- `docs/ops/post-recovery-guarded-tick-check.md`
- `docs/ops/qa-blocker-clear-check.md`
- `docs/ops/repeatable-loop-check.md`
- `docs/ops/scheduled-tick-plan.md`
- `docs/ops/scheduled-tick-safety-check.md`
- `docs/ops/state-model.md`
- `docs/ops/unattended-tick-plan.md`

**Purpose:** State machine persistence — bounded backlog, blockers, completion ledger, current objective, next step queue.

---

## Source-of-Truth Question

**Critical decision:** Are these files **persistent state stores** or **transient runtime cache**?

**Current reality:** They function as persistent state stores:
1. Actively read/written by core scripts
2. Served to production dashboard (`/var/www/office/`)
3. Documented as state machine components in 13 ops docs
4. Manual operator edits expected (tasks.json)

**If untracked without migration:**
- Git checkout leaves files untracked but present locally
- Scripts assume files exist post-checkout
- Dashboard sync breaks (`sync_file` commands fail)
- Ops procedures break (operators read these files manually)
- State machine loses persistence (tick execution depends on it)

---

## Options

### Option A: Keep Tracked (Current State)

**Description:** Accept these files as permanent tracked artifacts.

**Pros:**
- Zero migration cost
- No code changes required
- Ops docs remain valid
- Dashboard continues working
- Fresh checkout has state immediately

**Cons:**
- Repo contains runtime state (unconventional)
- State merges may cause conflicts
- No separation of code vs. data
- State history in git (may be undesirable)

**Impact:** Status quo — no changes needed.

### Option B: Init-on-Checkout

**Description:** Untrack files, add post-checkout hook to initialize defaults.

**Pros:**
- Clean separation of code vs. state
- No runtime state in repo
- Fresh state on each checkout

**Cons:**
- **BREAKS OPERATIONS:**
  - Loses task board state on checkout
  - Loses completion history (`completed.jsonl`)
  - Loses current objective/next-step
  - Dashboard shows empty state until first tick
- Requires init scripts for all 8 files
- Requires post-checkout hook setup
- Requires docs updates (13 ops docs)
- Manual state recovery needed after checkout

**Migration steps:**
1. Create `scripts/init-state.sh` (state.json, tasks.json, .world.json)
2. Create `scripts/init-runtime.sh` (runtime/state/*.json)
3. Create `.git/hooks/post-checkout` (calls init scripts)
4. Update 13 ops docs to reflect init-on-checkout behavior
5. Update `AGENTS.md`, `README.md` with init steps
6. Test fresh checkout in clean directory
7. Untrack files: `git rm --cached state.json tasks.json .world.json runtime/state/*.json`

**Verdict:** **NOT RECOMMENDED** — breaks operational continuity.

### Option C: External Store (Supabase/Database)

**Description:** Migrate state to Supabase Postgres or external database.

**Pros:**
- Proper persistence layer
- Query capabilities
- Multi-instance support
- No repo bloat
- State backup/restore built-in

**Cons:**
- **MAJOR ARCHITECTURE CHANGE:**
  - Requires database schema design
  - Requires migration of all readers (20+ scripts)
  - Requires backend API changes
  - Requires offline fallback strategy
  - Adds infrastructure dependency
  - Breaks current ops procedures (operators read files directly)
- High implementation cost (weeks, not days)
- Risk of breaking working system

**Migration steps:**
1. Design Supabase schema (states, tasks, world, runtime_state tables)
2. Create migration SQL
3. Update `backend/server.js` to read/write database
4. Update `scripts/update_state.sh` to use API
5. Update 20+ scripts to use API or local cache
6. Create offline fallback (local cache when DB unavailable)
7. Update 13 ops docs for new state access patterns
8. Test extensively
9. Untrack files after migration verified

**Verdict:** **LONG-TERM GOAL** — not suitable for PR #25 cleanup.

### Option D: Generated Local Runtime State

**Description:** State files generated on first run, persisted locally (`.gitignore`), never tracked.

**Pros:**
- Clean repo (no runtime state)
- State persists locally between runs
- No merge conflicts

**Cons:**
- **BREAKS FRESH CHECKOUT:**
  - New checkout has no state until first tick
  - Dashboard empty until state generated
  - Operators must run init before ops procedures work
- Requires init script (one-time generation)
- Requires docs updates
- State lost if local directory deleted

**Migration steps:**
1. Add to `.gitignore`: `state.json`, `tasks.json`, `.world.json`, `runtime/state/*.json`
2. Create `scripts/init-state.sh` (generates defaults if missing)
3. Update `backend/server.js` to call init on startup if missing
4. Update 13 ops docs to include init step
5. Update `AGENTS.md` with post-checkout init requirement
6. Untrack files: `git rm --cached ...`
7. Test fresh checkout + init flow

**Verdict:** **VIABLE ALTERNATIVE** — requires prep work before PR #25.

---

## Pros/Cons Summary

| Option | Repo Clean | Ops Safe | Migration Cost | Recommended |
|--------|------------|----------|----------------|-------------|
| A. Keep Tracked | ❌ | ✅ | None | **SHORT-TERM** |
| B. Init-on-Checkout | ✅ | ❌ | Medium | ❌ |
| C. External Store | ✅ | ⚠️ (after migration) | High | **LONG-TERM** |
| D. Generated Local | ✅ | ⚠️ (with init) | Low-Medium | **MID-TERM** |

---

## Recommended Decision

**Phase 1 (Immediate — PR #25 blocked):** Keep tracked (Option A)

**Rationale:**
- Current system works
- No safe migration path ready
- Untracking now breaks operations
- PR #25 cleanup cannot proceed without migration prep

**Phase 2 (Next Safe PR):** Prepare Option D migration

**Required prep:**
1. Create `scripts/init-state.sh`
2. Create `scripts/init-runtime.sh`
3. Update `backend/server.js` to call init on missing state
4. Update 13 ops docs with init step
5. Update `AGENTS.md` with post-checkout init requirement
6. Test fresh checkout + init flow in clean directory

**Phase 3 (Future Cleanup PR):** Untrack after Option D verified

**Untrack list:**
```bash
git rm --cached state.json tasks.json .world.json
git rm --cached runtime/state/backlog.json
git rm --cached runtime/state/blockers.json
git rm --cached runtime/state/completed.jsonl
git rm --cached runtime/state/current-objective.json
git rm --cached runtime/state/next-step.json
```

**Add to `.gitignore`:**
```
# Runtime state (generated on first run)
state.json
tasks.json
.world.json
runtime/state/*.json
```

---

## Migration Steps (Option D)

### Step 1: Create Init Scripts

**`scripts/init-state.sh`:**
```bash
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Initialize state.json if missing
if [ ! -f state.json ]; then
  cat > state.json <<'EOF'
{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","mode":"initialized","gatewayUp":true,"currentSteps":[],"activeSteps":[]}
EOF
  echo "Created state.json"
fi

# Initialize tasks.json if missing
if [ ! -f tasks.json ]; then
  cat > tasks.json <<'EOF'
{"tasks":[]}
EOF
  echo "Created tasks.json"
fi

# Initialize .world.json if missing
if [ ! -f .world.json ]; then
  cat > .world.json <<'EOF'
{"toggles":{"lights":false,"door_room2":true},"metrics":{"lastToggleAt":null,"lastToggleId":null}}
EOF
  echo "Created .world.json"
fi
```

**`scripts/init-runtime.sh`:**
```bash
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

mkdir -p runtime/state

# Initialize runtime state files if missing
[ -f runtime/state/backlog.json ] || echo '{"items":[]}' > runtime/state/backlog.json
[ -f runtime/state/blockers.json ] || echo '{"blockers":[]}' > runtime/state/blockers.json
[ -f runtime/state/completed.jsonl ] || touch runtime/state/completed.jsonl
[ -f runtime/state/current-objective.json ] || echo '{"title":"Init","description":"System initialized","assignedRole":"none","status":"completed"}' > runtime/state/current-objective.json
[ -f runtime/state/next-step.json ] || echo '{"title":"Awaiting objective","description":"Waiting for technical director","assignedRole":"technical-director","status":"queued"}' > runtime/state/next-step.json

echo "Initialized runtime/state/"
```

### Step 2: Update Backend

**`backend/server.js`** — add init call on startup:
```javascript
const { execSync } = require('child_process');
const path = require('path');

function ensureStateInitialized() {
  const statePath = path.join(__dirname, '..', 'state.json');
  const tasksPath = path.join(__dirname, '..', 'tasks.json');
  const runtimePath = path.join(__dirname, '..', 'runtime', 'state');
  
  if (!fs.existsSync(statePath) || !fs.existsSync(tasksPath) || !fs.existsSync(runtimePath)) {
    console.log('Runtime state missing, running init...');
    execSync('bash scripts/init-state.sh && bash scripts/init-runtime.sh', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
  }
}

// Call on server startup
ensureStateInitialized();
```

### Step 3: Update Docs

**13 ops docs** — add prerequisite step:
```markdown
## Prerequisites

1. Ensure runtime state initialized:
   ```bash
   bash scripts/init-state.sh
   bash scripts/init-runtime.sh
   ```
```

**Files to update:**
- `docs/ops/delayed-continuity-check.md`
- `docs/ops/manual-tick-trigger-check.md`
- `docs/ops/planner-recovery-check.md`
- `docs/ops/post-recovery-guarded-tick-check.md`
- `docs/ops/qa-blocker-clear-check.md`
- `docs/ops/repeatable-loop-check.md`
- `docs/ops/safe-tick-execution-check.md`
- `docs/ops/scheduled-tick-plan.md`
- `docs/ops/scheduled-tick-safety-check.md`
- `docs/ops/state-driven-execution-check.md`
- `docs/ops/state-model.md`
- `docs/ops/supervisor-tick-checklist.md`
- `docs/ops/unattended-tick-plan.md`

### Step 4: Update Main Docs

**`AGENTS.md`:**
```markdown
## Post-Checkout Setup

After cloning or checking out a fresh branch:

```bash
bash scripts/init-state.sh
bash scripts/init-runtime.sh
```

This initializes runtime state files required for operation.
```

### Step 5: Test Fresh Checkout

```bash
# In clean directory
git clone <repo> officebot-test
cd officebot-test
# Verify state files missing
ls state.json tasks.json runtime/state/*.json  # Should not exist
# Run init
bash scripts/init-state.sh
bash scripts/init-runtime.sh
# Verify state files created
ls state.json tasks.json runtime/state/*.json  # Should exist
# Verify backend starts
node backend/server.js  # Should start without errors
```

### Step 6: Untrack Files

```bash
git rm --cached state.json tasks.json .world.json
git rm --cached runtime/state/backlog.json
git rm --cached runtime/state/blockers.json
git rm --cached runtime/state/completed.jsonl
git rm --cached runtime/state/current-objective.json
git rm --cached runtime/state/next-step.json
```

### Step 7: Update .gitignore

```
# Runtime state (generated on first run)
state.json
tasks.json
.world.json
runtime/state/*.json
```

---

## Risks

### Risk 1: State Loss on Checkout

**If Option B (Init-on-Checkout) chosen without state backup:**
- Task board state lost
- Completion history lost
- Current objective lost
- Operators must manually recover state

**Mitigation:** Option D (Generated Local) preserves local state — only fresh checkouts affected.

### Risk 2: Init Script Failure

**If init scripts fail:**
- Backend startup fails
- Dashboard shows errors
- Ops procedures blocked

**Mitigation:**
- Test init scripts extensively
- Add fallback defaults in backend
- Document recovery steps

### Risk 3: Docs Drift

**If ops docs not updated:**
- Operators follow stale procedures
- Confusion about state location
- Failed manual operations

**Mitigation:**
- Update all 13 ops docs in same PR
- Add init step to doc templates
- Include init in ops checklist

### Risk 4: Merge Conflicts

**If state files remain tracked:**
- Frequent merge conflicts on `state.json`, `tasks.json`
- Operators must resolve conflicts carefully

**Mitigation:**
- Use Option D to untrack
- Train operators on conflict resolution
- Consider `.gitattributes merge=ours` for state files

---

## Required Code/Doc Changes

### Code Changes
1. `scripts/init-state.sh` (NEW)
2. `scripts/init-runtime.sh` (NEW)
3. `backend/server.js` (add init call on startup)
4. `.gitignore` (add runtime state patterns)

### Doc Changes
1. `AGENTS.md` (add post-checkout init)
2. `README.md` (add post-checkout init)
3. 13 ops docs (add init prerequisite)
4. `docs/ops/state-model.md` (clarify generated vs. tracked)

### Git Changes
1. `git rm --cached` for 8 state files
2. Commit init scripts + docs updates first
3. Separate commit for untracking

---

## Decision Record

**Decision:** **DEFERRED** — Option A (Keep Tracked) for PR #25

**Rationale:**
- Migration prep (Option D) not complete
- Untracking now breaks operations
- Safe cleanup requires init scripts + docs updates first

**Next Action:**
1. Create init scripts (Phase 2)
2. Update docs (Phase 2)
3. Test fresh checkout flow (Phase 2)
4. Propose cleanup PR after verification (Phase 3)

**Owner Approval Required:**
- [ ] Confirm Option D as target migration
- [ ] Approve init script implementation
- [ ] Approve docs update scope (13 ops docs)
- [ ] Approve fresh checkout test plan
- [ ] Set timeline for Phase 2/3

---

**References:**
- `/output/officebot-remaining-artifacts-architecture-decision-review.md`
- `docs/tracked-artifact-cleanup-manifest.md`
- `docs/ops/state-model.md`
- `scripts/update_state.sh`
- `backend/server.js`
