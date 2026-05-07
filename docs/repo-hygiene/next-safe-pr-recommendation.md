# OfficeBot Next Safe PR Recommendation

**Date:** 2026-05-07  
**Context:** Post PR #24 merge, PR #25 cleanup blocked

---

## Executive Summary

**Question:** Is there a safe PR #25 cleanup now?

**Answer:** **NO** — PR #25 cleanup (untracking state, build, evidence files) is **NOT SAFE** without migration prep.

**Recommended next PR:** **Docs-only ADR proposal PR** (safe, no untracking)

---

## Current Situation

### What's Blocked

PR #25 cleanup cannot proceed because:

1. **Runtime state files are actively used** — `state.json`, `tasks.json`, `runtime/state/*.json` read by 20+ scripts and 13 ops docs
2. **Build artifacts serve demo** — `Build/*` required for WebGL demo, `index.html` breaks without them
3. **Visual evidence referenced by tests** — PNG/B64 files used by test agents and QA procedures
4. **No migration prep complete** — Init scripts, docs updates, and graceful degradation not implemented

### What Was Safe (Already Done)

- **PR #22:** `docs/tracked-artifact-cleanup-manifest.md` — Docs only ✅
- **PR #23:** Untrack `live_ops_daemon.log` — Zero references ✅
- **PR #24:** Untrack `.tasks.backup.json`, `.runtime_progress.json`, `.live_ops.jsonl` — No code refs ✅

### What's NOT Safe

- Untracking `state.json` — Breaks 20+ consumers
- Untracking `tasks.json` — Breaks task board
- Untracking `runtime/state/*.json` — Breaks 13 ops docs
- Untracking `Build/*` — Breaks WebGL demo
- Untracking `*.png` — Breaks test evidence workflow

---

## Recommended Next PR: Docs-Only ADR Proposal

### PR Scope

**Type:** Documentation only  
**Risk:** None (no untracking, no code changes)  
**Goal:** Present migration options for owner decision

### Files to Add

1. `/output/officebot-adr-runtime-state-strategy.md` ✅ (already created)
2. `/output/officebot-adr-build-artifact-strategy.md` ✅ (already created)
3. `/output/officebot-adr-visual-evidence-strategy.md` ✅ (already created)
4. `/output/officebot-pr25-readiness-checklist.md` ✅ (already created)
5. `/output/officebot-next-safe-pr-recommendation.md` (this document)

### Files to Modify (Optional)

If submitting as GitHub PR (not just local docs):

1. `docs/adr/runtime-state-strategy.md` — Copy from /output
2. `docs/adr/build-artifact-strategy.md` — Copy from /output
3. `docs/adr/visual-evidence-strategy.md` — Copy from /output
4. `docs/adr/README.md` — Add ADR index

### PR Description Template

```markdown
## Purpose

This PR presents Architecture Decision Records (ADRs) for tracked artifact cleanup. No files are untracked in this PR — it is documentation only to facilitate owner decisions.

## Background

PR #22, #23, #24 successfully untracked log files and backup caches with zero code references.

PR #25 cleanup (state, build, evidence) is **blocked** because remaining candidates have 1–27 code/doc references each. Untracking now would break:
- Runtime (state.json, tasks.json)
- State machine (runtime/state/*.json)
- WebGL demo (Build/*)
- Test evidence (PNG files)

## ADRs Proposed

### 1. Runtime State Strategy

**Options:**
- A. Keep tracked (status quo)
- B. Init-on-checkout (breaks continuity)
- C. External store/Supabase (long-term)
- D. Generated local runtime state (recommended mid-term)

**Recommendation:** Option A (short-term) → Option D (mid-term)

**Prep required:** Init scripts, backend auto-init, 13 ops docs updates

### 2. Build Artifact Strategy

**Options:**
- A. Keep tracked (status quo)
- B. GitHub Releases artifact (recommended mid-term)
- C. Separate release branch
- D. CI-generated artifact (long-term)

**Recommendation:** Option A (short-term) → Option B (mid-term)

**Prep required:** GitHub Release creation, index.html graceful degradation, docs updates

### 3. Visual Evidence Strategy

**Options:**
- A. Keep tracked (status quo)
- B. Move to /docs/evidence with naming policy (recommended mid-term)
- C. GitHub Actions artifacts
- D. External artifact storage (long-term)

**Recommendation:** Option A (short-term) → Option B (mid-term)

**Prep required:** Directory structure, naming policy, capture service path updates

## Decision Required

Maintainer approval needed for:
1. Runtime state strategy (Option A→D)
2. Build artifact strategy (Option A→B)
3. Visual evidence strategy (Option A→B)
4. Timeline for migration prep (Phase 2)

## Next Steps After Approval

1. Create init scripts (runtime state)
2. Create GitHub Release (build artifacts)
3. Move evidence files (visual evidence)
4. Update docs (all three strategies)
5. Test fresh checkout flows
6. Propose cleanup PR #25a, #25b, #25c (separate PRs)

## Files Changed

- ADD: docs/adr/runtime-state-strategy.md
- ADD: docs/adr/build-artifact-strategy.md
- ADD: docs/adr/visual-evidence-strategy.md
- ADD: docs/adr/README.md (ADR index)
- ADD: docs/pr25-readiness-checklist.md
```

### Why This PR Is Safe

1. **No untracking** — All files remain tracked
2. **No code changes** — Scripts, backend, capture service unchanged
3. **No breaking changes** — Ops procedures work as before
4. **Decision facilitation** — Provides structured options for maintainer
5. **Reversible** — Docs can be updated later based on decisions

---

## Alternative Safe PRs

If ADR proposal PR is not desired, these are also safe:

### Option 1: Logs-Only Cleanup PR

**Scope:** Untrack log files with zero/low references

**Candidates:**
- `backend/backend.log` (2 refs — verify if docs or code)
- `state_sync_daemon.log` (1 ref — verify if docs or code)
- `scripts/ops/self_improve.log` (1 ref — verify if docs or code)

**Excluded (test evidence):**
- `artefacts/func004/sequence/console.log` (20 refs — DO NOT UNTRACK)
- `artefacts/func004/sequence_console.log` (5 refs — DO NOT UNTRACK)

**Prep required:**
1. Verify refs are docs-only (not code)
2. Confirm logs not needed for ops procedures
3. Add `*.log` to `.gitignore` (already present, verify coverage)

**Risk:** Low — logs are transient, already covered by `.gitignore`

**Why safe:** Logs are not read by scripts, not served to dashboard, not referenced by ops docs as data sources

### Option 2: Evidence Reorganization PR (No Untracking)

**Scope:** Move PNG/B64 files to `docs/evidence/` with `git mv`

**Files:**
- `current_scene.png` → `docs/evidence/scenes/current_scene.png`
- `screenshot_latest.png` → `docs/evidence/screenshots/screenshot_latest.png`
- `viz_fix.png` → `docs/evidence/fixes/viz_fix.png`
- `scene_check.b64` → `docs/evidence/scenes/scene_check.b64`
- `artefacts/func004/*.png` → `docs/evidence/func004/*.png`

**Prep required:**
1. Create `docs/evidence/` directory structure
2. Create `docs/evidence/README.md` (naming policy)
3. Update capture service output paths
4. Update test agent references

**Risk:** Low — files remain tracked, just reorganized

**Why safe:** `git mv` preserves history, files still accessible, paths updated in code/docs

### Option 3: Init Scripts PR (No Untracking)

**Scope:** Add init scripts without untracking files

**Files:**
- NEW: `scripts/init-state.sh`
- NEW: `scripts/init-runtime.sh`
- MOD: `backend/server.js` (add auto-init call)
- MOD: `AGENTS.md` (document init step)

**Prep required:**
1. Create init scripts
2. Test init scripts
3. Add backend auto-init
4. Update docs

**Risk:** Low — init scripts are additive, don't break existing flow

**Why safe:** Files remain tracked, init scripts only run if files missing (defensive)

**Benefit:** Prepares for future untracking without committing to it

---

## NOT Recommended: Combined Cleanup PR

**DO NOT** combine all three categories (state + build + evidence) into single PR #25.

**Reasons:**
1. **Too large** — 8+ state files, 4 build files, 20+ evidence files
2. **Too risky** — Three independent failure modes
3. **Hard to review** — Reviewers must understand three different strategies
4. **Hard to rollback** — If one category fails, all must be reverted
5. **Blocks progress** — If state migration has issues, build/evidence cleanup also blocked

**Recommended:** Separate PRs:
- PR #25a: Runtime state cleanup (after Option D prep)
- PR #25b: Build artifacts cleanup (after Option B prep)
- PR #25c: Visual evidence cleanup (after Option B prep)
- PR #26: Logs cleanup (can be done independently)

---

## Decision Matrix

| PR Type | Risk | Prep Required | Owner Decision | Recommended |
|---------|------|---------------|----------------|-------------|
| Docs-only ADR proposal | None | None (docs already created) | Yes (on ADR options) | ✅ **NEXT** |
| Logs-only cleanup | Low | Verify refs are docs-only | No | ✅ Also safe |
| Evidence reorganization | Low | Create dirs, update paths | No | ✅ Also safe |
| Init scripts (no untrack) | Low | Create/test scripts | No | ✅ Also safe |
| Runtime state untrack | High | Init scripts + docs + tests | Yes (on strategy) | ❌ Not yet |
| Build artifacts untrack | High | Release + index.html + docs | Yes (on strategy) | ❌ Not yet |
| Visual evidence untrack | Medium | Move to docs/evidence/ | Yes (on strategy) | ❌ Not yet |
| Combined cleanup | Very High | All prep for all three | Yes (on all) | ❌ Never |

---

## Timeline Recommendation

### Week 1: Docs + Decision
- [ ] Submit docs-only ADR proposal PR
- [ ] Maintainer reviews ADRs
- [ ] Maintainer approves strategies (Option A→D, A→B, A→B)

### Week 2-3: Prep Work (Phase 2)
- [ ] Create init scripts (runtime state)
- [ ] Create GitHub Release (build artifacts)
- [ ] Move evidence files (visual evidence)
- [ ] Update all docs (13 ops docs + main docs)
- [ ] Test fresh checkout flows

### Week 4: Cleanup PRs (Phase 3)
- [ ] PR #25a: Runtime state untrack (Option D)
- [ ] PR #25b: Build artifacts untrack (Option B)
- [ ] PR #25c: Visual evidence reorganization (Option B)
- [ ] PR #26: Logs untrack (independent)

---

## Final Recommendation

**Next PR:** Docs-only ADR proposal

**Why:**
1. Zero risk — no untracking, no code changes
2. Facilitates decisions — structured options for maintainer
3. Documents rationale — future reference for why cleanup blocked
4. Enables Phase 2 — maintainer approval unlocks prep work
5. Already complete — ADRs written, just need to submit

**PR title:** `docs: ADR proposals for tracked artifact cleanup strategies`

**PR labels:** `documentation`, `adr`, `needs-decision`

**Reviewers:** @maintainer

**After merge:** Begin Phase 2 prep work (init scripts, Release creation, evidence reorganization)

---

## Owner Approval Required

**For docs-only ADR PR:**
- [ ] Approve ADR submission as docs-only PR
- [ ] Review runtime state strategy (Option A→D)
- [ ] Review build artifact strategy (Option A→B)
- [ ] Review visual evidence strategy (Option A→B)
- [ ] Approve Phase 2 timeline (2-3 weeks prep)

**For Phase 2 prep work:**
- [ ] Approve init script implementation
- [ ] Approve GitHub Release creation
- [ ] Approve evidence reorganization
- [ ] Approve docs update scope (13 ops docs)

**For Phase 3 cleanup PRs:**
- [ ] Approve PR #25a scope (runtime state untrack)
- [ ] Approve PR #25b scope (build artifacts untrack)
- [ ] Approve PR #25c scope (evidence reorganization)
- [ ] Approve separate PR strategy (not combined)

---

**References:**
- `/output/officebot-adr-runtime-state-strategy.md`
- `/output/officebot-adr-build-artifact-strategy.md`
- `/output/officebot-adr-visual-evidence-strategy.md`
- `/output/officebot-pr25-readiness-checklist.md`
- `/output/officebot-remaining-artifacts-architecture-decision-review.md`
