# OfficeBot PR #25 Readiness Checklist

**Date:** 2026-05-07  
**Status:** NOT READY — Multiple blockers  
**Target:** Tracked artifact cleanup (state, build, visual evidence)

---

## Executive Summary

**Current verdict: NO-GO for PR #25**

PR #25 cannot proceed until all checklist items below are completed and verified. Three ADRs have been created to define migration strategies:

1. `/output/officebot-adr-runtime-state-strategy.md` — Runtime state files
2. `/output/officebot-adr-build-artifact-strategy.md` — Build artifacts
3. `/output/officebot-adr-visual-evidence-strategy.md` — Visual evidence

---

## 1. Owner Decisions (REQUIRED BEFORE ANY CODE CHANGES)

### 1.1 Runtime State Strategy

**Decision required:** Which option for `state.json`, `tasks.json`, `.world.json`, `runtime/state/*.json`?

- [ ] **Option A:** Keep tracked indefinitely (status quo)
- [ ] **Option B:** Init-on-checkout (requires init scripts)
- [ ] **Option C:** External store/Supabase (long-term migration)
- [ ] **Option D:** Generated local runtime state (mid-term target)

**Recommended:** Option A (short-term) → Option D (mid-term)

**Owner:** @maintainer  
**Decision date:** _Pending_  
**Notes:** _Decision required before PR #25 scope can be defined_

### 1.2 Build Artifact Strategy

**Decision required:** Which option for `Build/*.wasm`, `*.data`, `*.framework.js`, `*.loader.js`?

- [ ] **Option A:** Keep tracked indefinitely (status quo)
- [ ] **Option B:** GitHub Releases artifact (mid-term target)
- [ ] **Option C:** Separate release branch
- [ ] **Option D:** CI-generated artifact (long-term)

**Recommended:** Option A (short-term) → Option B (mid-term)

**Owner:** @maintainer  
**Decision date:** _Pending_  
**Notes:** _Requires GitHub Release creation before untracking_

### 1.3 Visual Evidence Strategy

**Decision required:** Which option for `*.png`, `*.b64` files?

- [ ] **Option A:** Keep tracked indefinitely (status quo)
- [ ] **Option B:** Move to `/docs/evidence/` with naming policy (mid-term)
- [ ] **Option C:** GitHub Actions artifacts
- [ ] **Option D:** External artifact storage (long-term)

**Recommended:** Option A (short-term) → Option B (mid-term)

**Owner:** @maintainer  
**Decision date:** _Pending_  
**Notes:** _Low-risk reorganization, can be done in separate PR_

### 1.4 Log Cleanup Strategy

**Decision required:** Should log files be untracked in separate PR?

**Candidate files:**
- `backend/backend.log` (2 refs — verify if code or docs)
- `state_sync_daemon.log` (1 ref — verify if code or docs)
- `scripts/ops/self_improve.log` (1 ref — verify if code or docs)

**Excluded (test evidence):**
- `artefacts/func004/sequence/console.log` (20 refs — DO NOT UNTRACK)
- `artefacts/func004/sequence_console.log` (5 refs — DO NOT UNTRACK)

- [ ] **Decision:** Logs-only PR before state/build cleanup
- [ ] **Decision:** Combine logs with state/build cleanup

**Recommended:** Separate logs-only PR first (lower risk)

**Owner:** @maintainer  
**Decision date:** _Pending_

---

## 2. Code Changes (REQUIRED BY STRATEGY)

### 2.1 Runtime State Init Scripts (Option D)

**Files to create:**

- [ ] `scripts/init-state.sh` — Initialize `state.json`, `tasks.json`, `.world.json`
- [ ] `scripts/init-runtime.sh` — Initialize `runtime/state/*.json`

**Template:** See ADR `/output/officebot-adr-runtime-state-strategy.md` Section "Migration Steps"

**Verification:**
```bash
# Fresh checkout test
rm -rf state.json tasks.json .world.json runtime/state/
bash scripts/init-state.sh
bash scripts/init-runtime.sh
# Verify all files created with valid JSON
```

### 2.2 Backend Init Call (Option D)

**File to modify:**

- [ ] `backend/server.js` — Add init call on startup if state missing

**Code:**
```javascript
function ensureStateInitialized() {
  // Check and run init scripts if state missing
}
ensureStateInitialized();
```

**Verification:**
```bash
# Remove state, start backend
rm state.json tasks.json
node backend/server.js
# Verify init runs automatically, state files created
```

### 2.3 Unity Loader Check (Build Option B)

**File to modify:**

- [ ] `scripts/unity-loader.js` — Add build existence check with download URL

**Code:**
```javascript
function ensureBuild() {
  if (!fs.existsSync(BUILD_PATH)) {
    console.error('Build artifacts not found.');
    console.error('Download from: https://github.com/.../releases/latest');
    process.exit(1);
  }
}
```

**Verification:**
```bash
# Remove Build/, run loader
rm -rf Build/
node scripts/unity-loader.js
# Verify error message with download URL
```

### 2.4 Index.html Graceful Degradation (Build Option B)

**File to modify:**

- [ ] `index.html` — Add fallback when Build/ missing

**Template:** See ADR `/output/officebot-adr-build-artifact-strategy.md` Section "Migration Steps"

**Verification:**
```bash
# Remove Build/, open index.html in browser
rm -rf Build/
# Open index.html — should show "Download Required" message
```

### 2.5 Capture Service Path Update (Evidence Option B)

**File to modify:**

- [ ] `backend/controlPlane/services/webStudio/webStudioBrowserCaptureService.js` — Update output paths to `docs/evidence/`

**Changes:**
- `current_scene.png` → `docs/evidence/scenes/current_scene.png`
- `screenshot_latest.png` → `docs/evidence/screenshots/screenshot_latest.png`

**Verification:**
```bash
# Run capture service, verify output location
node backend/controlPlane/services/webStudio/webStudioBrowserCaptureService.js
# Verify screenshot created in docs/evidence/screenshots/
```

---

## 3. Docs Updates (REQUIRED FOR ALL OPTIONS)

### 3.1 Main Documentation

- [ ] `AGENTS.md` — Add post-checkout init step (if Option D)
- [ ] `README.md` — Add WebGL download section (if Option B)
- [ ] `README.md` — Add evidence location section (if Option B)

### 3.2 Ops Documentation (13 files for Option D)

- [ ] `docs/ops/delayed-continuity-check.md`
- [ ] `docs/ops/manual-tick-trigger-check.md`
- [ ] `docs/ops/planner-recovery-check.md`
- [ ] `docs/ops/post-recovery-guarded-tick-check.md`
- [ ] `docs/ops/qa-blocker-clear-check.md`
- [ ] `docs/ops/repeatable-loop-check.md`
- [ ] `docs/ops/safe-tick-execution-check.md`
- [ ] `docs/ops/scheduled-tick-plan.md`
- [ ] `docs/ops/scheduled-tick-safety-check.md`
- [ ] `docs/ops/state-driven-execution-check.md`
- [ ] `docs/ops/state-model.md`
- [ ] `docs/ops/supervisor-tick-checklist.md`
- [ ] `docs/ops/unattended-tick-plan.md`

**Update:** Add init prerequisite step to each doc

### 3.3 Build Documentation (Option B)

- [ ] `ALGORITHM.md` — Update Build/ reference to Releases
- [ ] `AUTOBUILD_SETUP.md` — Update Build/ reference to Releases

### 3.4 Evidence Documentation (Option B)

- [ ] `docs/evidence/README.md` — NEW (naming policy)
- [ ] `agents/agency/test-evidence-collector.md` — Update paths
- [ ] `agents/agency/test-reality-checker.md` — Update paths
- [ ] Func004 test reports — Update paths

---

## 4. Init Scripts (REQUIRED FOR OPTION D)

### 4.1 Init-State Script

**File:** `scripts/init-state.sh`

**Checklist:**
- [ ] Creates `state.json` with valid default JSON
- [ ] Creates `tasks.json` with valid default JSON
- [ ] Creates `.world.json` with valid default JSON
- [ ] Idempotent (safe to run multiple times)
- [ ] Prints confirmation messages
- [ ] Exits with code 0 on success

**Test:**
```bash
rm state.json tasks.json .world.json
bash scripts/init-state.sh
# Verify all three files exist with valid JSON
cat state.json | jq .
cat tasks.json | jq .
cat .world.json | jq .
```

### 4.2 Init-Runtime Script

**File:** `scripts/init-runtime.sh`

**Checklist:**
- [ ] Creates `runtime/state/` directory
- [ ] Creates `backlog.json` with valid default JSON
- [ ] Creates `blockers.json` with valid default JSON
- [ ] Creates `completed.jsonl` (empty file)
- [ ] Creates `current-objective.json` with valid default JSON
- [ ] Creates `next-step.json` with valid default JSON
- [ ] Idempotent (safe to run multiple times)
- [ ] Prints confirmation messages
- [ ] Exits with code 0 on success

**Test:**
```bash
rm -rf runtime/state/
bash scripts/init-runtime.sh
# Verify all five files exist with valid JSON
cat runtime/state/*.json | jq .
```

### 4.3 Post-Checkout Hook (Optional)

**File:** `.git/hooks/post-checkout`

**Checklist:**
- [ ] Calls `bash scripts/init-state.sh`
- [ ] Calls `bash scripts/init-runtime.sh`
- [ ] Executable (`chmod +x`)
- [ ] Handles missing scripts gracefully

**Note:** Git hooks are not versioned — must document manual setup or use alternative (e.g., npm postinstall)

---

## 5. Tests (REQUIRED BEFORE MERGE)

### 5.1 Fresh Checkout Test (Option D)

**Scenario:** Clone repo in clean directory, verify system works

**Steps:**
```bash
# Clean directory
rm -rf /tmp/officebot-test
cd /tmp
git clone <repo> officebot-test
cd officebot-test

# Verify state files missing (if untracked)
test ! -f state.json && echo "PASS: state.json not present"
test ! -f tasks.json && echo "PASS: tasks.json not present"
test ! -d runtime/state && echo "PASS: runtime/state not present"

# Run init
bash scripts/init-state.sh
bash scripts/init-runtime.sh

# Verify state files created
test -f state.json && echo "PASS: state.json created"
test -f tasks.json && echo "PASS: tasks.json created"
test -d runtime/state && echo "PASS: runtime/state created"

# Start backend
node backend/server.js &
BACKEND_PID=$!
sleep 2

# Verify backend running
curl http://localhost:3000/state.json | jq . && echo "PASS: /state.json endpoint works"
curl http://localhost:3000/tasks.json | jq . && echo "PASS: /tasks.json endpoint works"

# Cleanup
kill $BACKEND_PID
```

**Expected:** All tests pass

### 5.2 Build Download Test (Option B)

**Scenario:** Fresh checkout without Build/, verify graceful degradation

**Steps:**
```bash
# Clean directory
rm -rf /tmp/officebot-test
cd /tmp
git clone <repo> officebot-test
cd officebot-test

# Verify Build/ missing (if untracked)
test ! -d Build && echo "PASS: Build/ not present"

# Open index.html in headless browser
# Verify "Download Required" message shown

# Download from Releases, extract to Build/
# Refresh index.html
# Verify Unity demo loads
```

**Expected:** Graceful degradation, then working demo after download

### 5.3 Evidence Collection Test (Option B)

**Scenario:** Verify test agents find evidence in new location

**Steps:**
```bash
# Run evidence collector agent
# Verify it reads from docs/evidence/ paths
# Verify it can find current_scene.png, screenshot_latest.png
```

**Expected:** Evidence collector works with new paths

### 5.4 Ops Procedure Test (Option D)

**Scenario:** Operator follows ops doc, verify state access works

**Steps:**
```bash
# Follow docs/ops/manual-tick-trigger-check.md
# Verify state files readable
# Verify tick execution works
```

**Expected:** Ops procedure completes successfully

---

## 6. Rollback Plan (REQUIRED FOR MERGE)

### 6.1 Rollback Triggers

**Rollback if:**
- [ ] Fresh checkout test fails
- [ ] Backend fails to start after init
- [ ] Dashboard shows errors
- [ ] Ops procedures fail
- [ ] Test agents cannot find evidence
- [ ] WebGL demo broken without clear download path

### 6.2 Rollback Steps

**If rollback needed:**

```bash
# Revert PR commit
git revert <PR-25-commit-sha>

# Or restore files from backup
git checkout HEAD~1 -- state.json tasks.json .world.json runtime/state/
git checkout HEAD~1 -- Build/
git checkout HEAD~1 -- *.png *.b64

# Remove init scripts (if added)
rm scripts/init-state.sh scripts/init-runtime.sh

# Revert docs changes
git checkout HEAD~1 -- AGENTS.md README.md docs/ops/*.md
```

### 6.3 Backup Requirements

**Before merge:**
- [ ] Backup current `state.json` content
- [ ] Backup current `tasks.json` content
- [ ] Backup current `runtime/state/*.json` content
- [ ] Backup current `Build/*` files
- [ ] Backup current `*.png`, `*.b64` files

**Backup location:** `/output/officebot-pr25-backup/` or external storage

---

## 7. Branch Scope (REQUIRED FOR PR)

### 7.1 Branch Name

- [ ] `cleanup/pr25-runtime-state` (Option D)
- [ ] `cleanup/pr25-build-artifacts` (Option B)
- [ ] `cleanup/pr25-visual-evidence` (Option B)
- [ ] `cleanup/pr25-all` (combined — NOT RECOMMENDED)

**Recommended:** Separate PRs for each category (lower risk, easier review)

### 7.2 Commit Structure

**PR #25a (Runtime State):**
1. Commit: `feat: add init-state.sh and init-runtime.sh scripts`
2. Commit: `feat: backend auto-init on missing state`
3. Commit: `docs: update 13 ops docs with init prerequisite`
4. Commit: `docs: update AGENTS.md with post-checkout init`
5. Commit: `chore: untrack runtime state files`

**PR #25b (Build Artifacts):**
1. Commit: `feat: index.html graceful degradation for missing Build/`
2. Commit: `feat: unity-loader build check with download URL`
3. Commit: `docs: update README with WebGL download instructions`
4. Commit: `docs: update ALGORITHM.md, AUTOBUILD_SETUP.md`
5. Commit: `chore: untrack Build/* files`

**PR #25c (Visual Evidence):**
1. Commit: `docs: create docs/evidence/ structure and naming policy`
2. Commit: `feat: update capture service output paths`
3. Commit: `docs: update test agent references`
4. Commit: `chore: git mv evidence files to docs/evidence/`

### 7.3 Files Changed per PR

**PR #25a (Runtime State):**
- NEW: `scripts/init-state.sh`
- NEW: `scripts/init-runtime.sh`
- MOD: `backend/server.js`
- MOD: `AGENTS.md`
- MOD: `docs/ops/*.md` (13 files)
- MOD: `.gitignore` (add state patterns)
- RM: `state.json`, `tasks.json`, `.world.json`, `runtime/state/*.json` (from git index)

**PR #25b (Build Artifacts):**
- MOD: `index.html`
- MOD: `scripts/unity-loader.js`
- MOD: `README.md`
- MOD: `ALGORITHM.md`
- MOD: `AUTOBUILD_SETUP.md`
- MOD: `.gitignore` (add Build/ patterns)
- RM: `Build/*` (from git index)

**PR #25c (Visual Evidence):**
- NEW: `docs/evidence/README.md`
- MOD: `backend/controlPlane/services/webStudio/webStudioBrowserCaptureService.js`
- MOD: `agents/agency/test-evidence-collector.md`
- MOD: `agents/agency/test-reality-checker.md`
- MV: `*.png`, `*.b64`, `artefacts/func004/*.png` → `docs/evidence/`

---

## 8. Exact Allowlist (FILES THAT CAN BE UNTRACKED)

### 8.1 Runtime State (Option D only)

**Untrack list:**
```bash
git rm --cached state.json
git rm --cached tasks.json
git rm --cached .world.json
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

### 8.2 Build Artifacts (Option B only)

**Untrack list:**
```bash
git rm --cached Build/office.data
git rm --cached Build/office.framework.js
git rm --cached Build/office.loader.js
git rm --cached Build/office.wasm
```

**Add to `.gitignore`:**
```
# Unity WebGL build artifacts (download from Releases)
Build/*.data
Build/*.framework.js
Build/*.loader.js
Build/*.wasm
```

### 8.3 Visual Evidence (Option B only)

**Untrack list:**
```bash
# Root files
git rm --cached current_scene.png
git rm --cached screenshot_latest.png
git rm --cached viz_fix.png
git rm --cached scene_check.b64

# Artefacts (if moving to docs/evidence/)
git rm --cached artefacts/func004/01_after_seed.png
git rm --cached artefacts/func004/02_t12s.png
git rm --cached artefacts/func004/03_t24s.png
git rm --cached artefacts/func004/remote_scene.png
git rm --cached artefacts/func004/remote_scene_t0.png
git rm --cached artefacts/func004/remote_scene_t12.png
git rm --cached artefacts/func004/remote_scene_t24.png
git rm --cached artefacts/func004/sequence/*.png
```

**Add to `.gitignore` (if NOT moving to docs/evidence/):**
```
# Visual evidence (moved to docs/evidence/)
current_scene.png
screenshot_latest.png
viz_fix.png
scene_check.b64
artefacts/func004/*.png
artefacts/func004/sequence/*.png
```

**Note:** If Option B (move to `docs/evidence/`), files remain tracked — just moved with `git mv`.

### 8.4 Log Files (Separate PR recommended)

**Untrack list (verify refs first):**
```bash
git rm --cached backend/backend.log
git rm --cached state_sync_daemon.log
git rm --cached scripts/ops/self_improve.log
```

**DO NOT UNTRACK (test evidence):**
```bash
# artefacts/func004/sequence/console.log — 20 refs, test evidence
# artefacts/func004/sequence_console.log — 5 refs, test evidence
```

**Add to `.gitignore`:**
```
# Logs
*.log
!artefacts/func004/sequence/console.log
```

---

## 9. Final Go/No-Go Criteria

### 9.1 Must-Have (All Required)

- [ ] Owner decisions documented (Section 1)
- [ ] All code changes complete (Section 2)
- [ ] All docs updates complete (Section 3)
- [ ] Init scripts tested (Section 4)
- [ ] All tests pass (Section 5)
- [ ] Rollback plan documented (Section 6)
- [ ] Branch scope defined (Section 7)
- [ ] Allowlist verified (Section 8)

### 9.2 Should-Have (Strongly Recommended)

- [ ] Separate PRs for each category (not combined)
- [ ] Backup created before merge
- [ ] Stakeholder demo verified after merge
- [ ] Ops team trained on new workflow

### 9.3 Nice-to-Have (Optional)

- [ ] CI workflow for build artifacts (Option D long-term)
- [ ] External evidence storage (Option D long-term)
- [ ] Automated release uploads

---

## 10. Current Status

**Overall:** ❌ NOT READY

**Blockers:**
1. Owner decisions pending (Section 1)
2. Init scripts not created (Section 2.1)
3. Backend init not implemented (Section 2.2)
4. Index.html not updated (Section 2.4)
5. Capture service paths not updated (Section 2.5)
6. Docs not updated (Section 3)
7. Tests not run (Section 5)

**Next action:** Owner decisions required before any code changes

---

**References:**
- `/output/officebot-adr-runtime-state-strategy.md`
- `/output/officebot-adr-build-artifact-strategy.md`
- `/output/officebot-adr-visual-evidence-strategy.md`
- `/output/officebot-remaining-artifacts-architecture-decision-review.md`
