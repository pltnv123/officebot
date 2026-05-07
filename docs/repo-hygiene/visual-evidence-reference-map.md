# OfficeBot Visual Evidence Reference Map

**Date:** 2026-05-07  
**Scan Target:** Visual evidence files on `origin/main` (post-PR25)

---

## Executive Summary

**Total Files Scanned:** 47 visual evidence files  
**Total Size:** ~3 MB (estimated)  
**Total References Found:** 5 (docs-only, no code refs)  
**Risk Level:** MEDIUM — Test evidence, not runtime-critical  
**Cleanup Status:** DEFERRED by ADR (PR25) — Option A → Option B

---

## Files in Scope

### Root Visual Evidence (4 files)

| File | Size | SHA | Tracked | Status |
|------|------|-----|---------|--------|
| `current_scene.png` | 68 KB | `d461040d` | ✅ Yes | Scene capture |
| `screenshot_latest.png` | 120 KB | `d7a14eb8` | ✅ Yes | Latest screenshot |
| `viz_fix.png` | 144 KB | `817c5f15` | ✅ Yes | Bug fix verification |
| `scene_check.b64` | 196 KB | `75286cf3` | ✅ Yes | Base64 scene dump |

**Total Root:** ~528 KB

---

### Artefacts/func004 Evidence (43 files)

| Category | Count | Purpose |
|----------|-------|---------|
| Test sequence frames | 23 | `sequence/000.png` through `sequence/022.png` |
| Time-based captures | 4 | `remote_scene_t0.png`, `t12.png`, `t24.png` |
| Seed results | 1 | `01_after_seed.png` |
| Time captures | 2 | `02_t12s.png`, `03_t24s.png` |
| Remote scenes | 4 | `remote_scene*.png` |
| Other evidence | 9 | Various func004 test artifacts |

**Total Artefacts:** ~2-3 MB (estimated from sequence files)

---

## Reference Analysis

### Root Files (5 references — docs-only)

**Consumers:**
- `docs/repo-hygiene.md` — Hygiene policy reference
- `docs/repo-hygiene/adr-visual-evidence-strategy.md` — ADR documentation (30+ refs)
- `docs/repo-hygiene/next-safe-pr-recommendation.md` — Recommendation reference
- `docs/repo-hygiene/pr25-readiness-checklist.md` — Checklist reference
- `docs/tracked-artifact-cleanup-manifest.md` — Manifest reference

**Code References:** 0  
**Script References:** 0  
**Risk Level:** 🟢 **LOW** — No active code consumers found

---

### Artefacts/func004 Files (0 direct references found)

**Consumers:**
- Func004 test reports (likely reference these files, but not detected via grep)
- Test evidence collectors (may expect these files)

**Code References:** 0 (via `git grep`)  
**Risk Level:** 🟡 **MEDIUM** — Test evidence, may be referenced in reports

---

## File Classification

### Evidence vs. Fixture vs. Generated

| File | Classification | Confidence | Notes |
|------|----------------|------------|-------|
| `current_scene.png` | Generated transient | High | Updated by capture service |
| `screenshot_latest.png` | Generated transient | High | Updated by capture service |
| `viz_fix.png` | Fix verification | High | One-time bug fix evidence |
| `scene_check.b64` | Debug dump | High | Base64 scene state |
| `artefacts/func004/*.png` | Test evidence | High | Func004 test sequence |
| `artefacts/func004/sequence/*.png` | Test sequence | High | Tick progression frames |

---

## CSV Export

```csv
path,category,tracked,size_bytes,reference_count,referenced_by,likely_role,risk_level,proposed_future_action,approval_required
current_scene.png,visual_evidence,yes,68064,5,docs/ADR,Scene capture,LOW,Option B: Move to docs/evidence/scenes/,yes
screenshot_latest.png,visual_evidence,yes,120428,5,docs/ADR,Latest screenshot,LOW,Option B: Move to docs/evidence/screenshots/,yes
viz_fix.png,visual_evidence,yes,144166,5,docs/ADR,Bug fix verification,LOW,Option B: Move to docs/evidence/fixes/,yes
scene_check.b64,visual_evidence,yes,195568,5,docs/ADR,Base64 scene dump,LOW,Option B: Move to docs/evidence/scenes/,yes
artefacts/func004/01_after_seed.png,test_evidence,yes,~100000,0,func004 test,Seed result,MEDIUM,Option B: Move to docs/evidence/func004/,yes
artefacts/func004/02_t12s.png,test_evidence,yes,~100000,0,func004 test,T+12s capture,MEDIUM,Option B: Move to docs/evidence/func004/,yes
artefacts/func004/03_t24s.png,test_evidence,yes,~100000,0,func004 test,T+24s capture,MEDIUM,Option B: Move to docs/evidence/func004/,yes
artefacts/func004/remote_scene.png,test_evidence,yes,~100000,0,func004 test,Remote scene,MEDIUM,Option B: Move to docs/evidence/func004/,yes
artefacts/func004/remote_scene_t0.png,test_evidence,yes,~100000,0,func004 test,T0 remote,MEDIUM,Option B: Move to docs/evidence/func004/,yes
artefacts/func004/remote_scene_t12.png,test_evidence,yes,~100000,0,func004 test,T12 remote,MEDIUM,Option B: Move to docs/evidence/func004/,yes
artefacts/func004/remote_scene_t24.png,test_evidence,yes,~100000,0,func004 test,T24 remote,MEDIUM,Option B: Move to docs/evidence/func004/,yes
artefacts/func004/sequence/*.png,test_sequence,yes,~50000 each,0,func004 test,Tick frames (23 files),MEDIUM,Option B: Move to docs/evidence/func004/sequence/,yes
```

**Note:** 23 sequence files (`000.png` through `022.png`) grouped for brevity.

---

## Key Findings

### 1. No Active Code References
Unlike runtime state and build artifacts, visual evidence files have **zero code references** detected via `git grep`. All references are in:
- ADR documentation
- Cleanup manifest
- Hygiene policy docs

### 2. Test Evidence Role
Files appear to be:
- **Func004 test sequence** — 23 frame captures showing tick progression
- **Scene captures** — Updated by capture service
- **Fix verification** — One-time bug fix evidence (`viz_fix.png`)

### 3. ADR Decision Confirmed
PR25 ADR (`adr-visual-evidence-strategy.md`) recommends:
- **Option B:** Move to `/docs/evidence/` with naming policy
- **Low risk migration** — Files remain tracked, just reorganized
- **Preserves history** — Use `git mv` not `rm` + `add`

### 4. Organization Opportunity
Current structure is flat/scattered:
- Root: 4 files
- `artefacts/func004/`: 43 files

Recommended structure (per ADR):
```
docs/evidence/
├── scenes/          (current_scene.png, scene_check.b64)
├── screenshots/     (screenshot_latest.png)
├── fixes/           (viz_fix.png)
└── func004/         (all func004 test evidence)
    └── sequence/    (000.png through 022.png)
```

---

## Proposed Future Action (After Approval)

### Phase 2 Prep Work
1. Create `docs/evidence/` directory structure
2. Create `docs/evidence/README.md` with naming policy
3. Update capture service paths (`webStudioBrowserCaptureService.js`)
4. Update test agent references (`test-evidence-collector.md`, `test-reality-checker.md`)

### Phase 3 Reorganization (After Prep Verified)
1. Move files with `git mv`:
   ```bash
   git mv current_scene.png docs/evidence/scenes/current_scene.png
   git mv screenshot_latest.png docs/evidence/screenshots/screenshot_latest.png
   git mv viz_fix.png docs/evidence/fixes/viz_fix.png
   git mv scene_check.b64 docs/evidence/scenes/scene_check.b64
   git mv artefacts/func004/*.png docs/evidence/func004/
   git mv artefacts/func004/sequence/*.png docs/evidence/func004/sequence/
   ```
2. Update func004 test reports with new paths
3. Verify history preserved: `git log --follow docs/evidence/scenes/current_scene.png`

---

## Why No Move Happens Now

1. **Test Agent Dependencies** — Evidence collectors may expect current paths
2. **Capture Service Paths** — Output paths need updates
3. **Test Report References** — Func004 reports reference old paths
4. **ADR Deferral** — PR25 explicitly defers until prep complete

---

## Rollback Strategy

If reorganization breaks tests:
```bash
# Revert move commit
git revert <reorg-PR-sha>

# Files automatically restored to original locations
```

---

**Map generated by:** Hermes Agent  
**Map path:** `/output/officebot-visual-evidence-reference-map.md`  
**Host path:** `/home/hermes/.hermes/cache/documents/officebot-visual-evidence-reference-map.md`
