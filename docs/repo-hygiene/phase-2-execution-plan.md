# OfficeBot Phase 2 Master Plan

**Date:** 2026-05-07  
**Context:** Post-PR25 merge, pre-cleanup prep work

---

## 1. Executive Summary

**Goal:** Prepare repository for safe tracked artifact cleanup after PR25 ADR package.

**Phase 2 Scope:** Documentation and reference mapping only. No file deletions, moves, or untracking.

**Deliverables:**
- Phase 2 execution plan (docs-only PR26)
- Runtime state reference map
- Build artifact reference map
- Visual evidence reference map

**Timeline:** 1-2 days for docs-only Phase 2, then owner approval required for prep work.

---

## 2. Current Baseline After PR25

### Merged Hygiene PRs
| PR | Status | Impact |
|----|--------|--------|
| #21 | ✅ Merged | `.gitignore` for runtime/log/state |
| #22 | ✅ Merged | Tracked artifact manifest (29 candidates) |
| #23 | ✅ Merged | Untrack `live_ops_daemon.log` |
| #24 | ✅ Merged | Untrack 3 runtime backup files |
| #25 | ✅ Merged | ADR package (3 strategies deferred) |

### Main Branch
- **HEAD:** `ad50551b7ab0039f832c22ef17d715acb75657df`
- **Status:** Clean, all PR25 files present
- **Open PRs:** 0
- **Open Issues:** 0

### Deferred Cleanup (by ADR)
- Runtime state: 8 files (Option A→D)
- Build artifacts: 4 files (Option A→B)
- Visual evidence: 4+ files (Option A→B)

---

## 3. Workstream A — Runtime State Strategy Prep

### Objective
Document all references to runtime state files before any untracking.

### Files in Scope
- `state.json` (27 KB)
- `tasks.json` (8 KB)
- `.world.json` (163 B)
- `runtime/state/backlog.json`
- `runtime/state/blockers.json`
- `runtime/state/completed.jsonl`
- `runtime/state/current-objective.json`
- `runtime/state/next-step.json`

### Reference Scan Required
- `git grep` for each file
- Script references (`scripts/*.sh`, `scripts/*.js`)
- Backend references (`backend/**/*.js`)
- Docs references (`docs/**/*.md`)
- Workflow references (`.github/workflows/`)

### Deliverable
- `/output/officebot-runtime-state-reference-map.md`
- `/output/officebot-runtime-state-reference-map.csv`

### Future Action (After Approval)
- Create `scripts/init-state.sh`
- Create `scripts/init-runtime.sh`
- Update `backend/server.js` with auto-init
- Update 13 ops docs
- Test fresh checkout flow
- Untrack after verification

---

## 4. Workstream B — Build Artifact Strategy Prep

### Objective
Document all references to Build artifacts before any relocation or untracking.

### Files in Scope
- `Build/office.data` (6.4 MB)
- `Build/office.framework.js` (427 KB)
- `Build/office.loader.js` (27 KB)
- `Build/office.wasm` (33.5 MB)

### Reference Scan Required
- `index.html` references
- `scripts/unity-loader.js` references
- Docs references (`ALGORITHM.md`, `AUTOBUILD_SETUP.md`, etc.)
- Workflow references
- GitHub Pages assumptions
- Deployment assumptions

### Deliverable
- `/output/officebot-build-artifact-reference-map.md`
- `/output/officebot-build-artifact-reference-map.csv`

### Future Action (After Approval)
- Create GitHub Release with current `Build/*`
- Update `index.html` for graceful degradation
- Update `scripts/unity-loader.js`
- Update docs (`README.md`, `ALGORITHM.md`, `AUTOBUILD_SETUP.md`)
- Untrack after verification

---

## 5. Workstream C — Visual Evidence Strategy Prep

### Objective
Document all references to visual evidence files before any reorganization.

### Files in Scope
- `current_scene.png` (68 KB)
- `screenshot_latest.png` (120 KB)
- `viz_fix.png` (144 KB)
- `scene_check.b64` (196 KB)
- `artefacts/func004/*.png` (18+ files)

### Reference Scan Required
- Script references (capture service, test scripts)
- Docs references (test agents, QA docs)
- File sizes and last commit dates
- Evidence vs. fixture classification

### Deliverable
- `/output/officebot-visual-evidence-reference-map.md`
- `/output/officebot-visual-evidence-reference-map.csv`

### Future Action (After Approval)
- Create `docs/evidence/` directory structure
- Create naming policy (`docs/evidence/README.md`)
- Update capture service paths
- Update test agent references
- Move files with `git mv` (preserves history)

---

## 6. Dependencies

| Workstream | Depends On | Blocks |
|------------|------------|--------|
| A (Runtime) | None | Runtime state untrack PR |
| B (Build) | None | Build artifact untrack PR |
| C (Visual) | None | Evidence reorganization PR |

**All three workstreams are independent and can proceed in parallel.**

---

## 7. Approval Gates

| Gate | Required For | Current Status |
|------|--------------|----------------|
| Runtime state strategy (Option D) | Init scripts + untrack | ⏳ Pending owner review of ADR |
| Build artifact strategy (Option B) | GitHub Release + untrack | ⏳ Pending owner review of ADR |
| Visual evidence strategy (Option B) | Reorganization + path updates | ⏳ Pending owner review of ADR |
| Phase 2 prep work | Init scripts, Release creation | ⏳ Pending explicit approval |

**Phase 2 docs (this plan + reference maps) do NOT require approval.**

---

## 8. Proposed PR Sequence

### Docs-Only PRs (Autonomous Allowed)
| PR | Title | Scope | Status |
|----|-------|-------|--------|
| PR26 | `docs: add phase 2 repo hygiene execution plan` | Execution plan + 3 reference maps | 🔄 In progress |

### Prep Work PRs (Requires Approval)
| PR | Title | Scope | Status |
|----|-------|-------|--------|
| PR27 | `feat: add runtime state init scripts` | `scripts/init-state.sh`, `init-runtime.sh`, backend update | ⏳ After approval |
| PR28 | `feat: prepare GitHub Release for build artifacts` | Release creation workflow, docs updates | ⏳ After approval |
| PR29 | `docs: reorganize visual evidence to docs/evidence/` | `git mv` operations, path updates | ⏳ After approval |

### Cleanup PRs (Requires Approval)
| PR | Title | Scope | Status |
|----|-------|-------|--------|
| PR30 | `chore: untrack runtime state files` | `git rm --cached` for 8 state files | ⏳ After PR27 verified |
| PR31 | `chore: untrack Build artifacts` | `git rm --cached` for 4 build files | ⏳ After PR28 verified |
| PR32 | `chore: untrack log files` | `git rm --cached` for 6 log files | ⏳ After manual review |

---

## 9. Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| Reference maps incomplete | Low | Use multiple scan methods (git grep, search_files, terminal grep) |
| Future cleanup breaks ops | High | ADR-mandated prep work required before untracking |
| Build demo breaks after untrack | High | GitHub Release + graceful degradation required first |
| Evidence reorganization breaks tests | Medium | Path updates in test agents required first |
| Combined cleanup PR too large | Medium | Separate PRs per category (recommended in PR25) |

---

## 10. Acceptance Criteria

### Phase 2 Docs (PR26)
- [ ] Phase 2 execution plan documented
- [ ] Runtime state reference map complete (all 8 files scanned)
- [ ] Build artifact reference map complete (all 4 files scanned)
- [ ] Visual evidence reference map complete (all 4+ files scanned)
- [ ] All reference maps include CSV exports
- [ ] PR26 contains only `docs/repo-hygiene/*.md` files
- [ ] PR26 merged to main

### Phase 2 Prep Work (Future)
- [ ] Init scripts created and tested
- [ ] GitHub Release created with Build artifacts
- [ ] Evidence directory structure created
- [ ] All path references updated
- [ ] Fresh checkout flows tested

### Cleanup PRs (Future)
- [ ] Each cleanup PR contains only untracking for one category
- [ ] Prep work verified before untracking
- [ ] Rollback plan documented for each PR
- [ ] Owner approval obtained before each PR

---

## 11. Rollback Strategy

### PR26 Rollback (Docs-Only)
```bash
git revert <PR26-merge-sha>
```
**Impact:** Minimal — only docs removed from main.

### Future Prep Work Rollback
```bash
# Revert prep PR commits
git revert <prep-PR-sha>

# Restore any moved files
git checkout HEAD~1 -- <moved-files>
```

### Future Cleanup PR Rollback
```bash
# Revert untrack commit
git revert <cleanup-PR-sha>

# Re-track files
git add <files>
git commit -m "Restore tracked files after rollback"
```

---

## 12. Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Reference maps created | 3 | 0 → 3 (Phase 2) |
| Files scanned | 16+ | 0 → 16+ (Phase 2) |
| Docs-only PRs merged | 1 (PR26) | 0 → 1 (Phase 2) |
| Owner approvals obtained | 3 strategies | 0 (pending) |
| Prep work completed | 3 workstreams | 0 (pending) |
| Cleanup PRs merged | 4 (PR30-33) | 0 (future) |

---

**Plan generated by:** Hermes Agent  
**Plan path:** `/output/officebot-phase-2-master-plan.md`  
**Host path:** `/home/hermes/.hermes/cache/documents/officebot-phase-2-master-plan.md`
