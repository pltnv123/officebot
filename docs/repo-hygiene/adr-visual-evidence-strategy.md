# ADR: Visual Evidence Strategy

**Date:** 2026-05-07  
**Status:** Proposed  
**Deciders:** OfficeBot Maintainer  
**Context:** Post PR #24 merge, pre-PR #25 cleanup

---

## Summary

This ADR defines the storage and management strategy for visual evidence artifacts (PNG screenshots, base64 dumps) currently tracked in the OfficeBot repository.

**Files in scope:**
- `current_scene.png` (68,064 B — 68 KB)
- `screenshot_latest.png` (120,428 B — 120 KB)
- `viz_fix.png` (144,166 B — 144 KB)
- `scene_check.b64` (195,568 B — 196 KB)

**Additional PNG files tracked (artefacts/func004/):**
- `artefacts/func004/01_after_seed.png`
- `artefacts/func004/02_t12s.png`
- `artefacts/func004/03_t24s.png`
- `artefacts/func004/remote_scene.png`
- `artefacts/func004/remote_scene_t0.png`
- `artefacts/func004/remote_scene_t12.png`
- `artefacts/func004/remote_scene_t24.png`
- `artefacts/func004/sequence/000.png` through `017.png` (18 files)

**Total size (root PNGs):** ~428 KB  
**Total size (including artefacts/func004/):** ~2–3 MB (estimated)

---

## Current Use

### Visual/Test Evidence

PNG files serve as:

1. **Scene verification** — `current_scene.png` shows current Unity scene state
2. **Latest screenshot** — `screenshot_latest.png` updated by capture service
3. **Fix verification** — `viz_fix.png` proves visualization bug was fixed
4. **Scene dump** — `scene_check.b64` is base64-encoded scene state
5. **Func004 test sequence** — `artefacts/func004/sequence/*.png` shows tick progression

### Current Consumers

**Code references:**
- `backend/controlPlane/services/webStudio/webStudioBrowserCaptureService.js` — Captures screenshots
- `agents/agency/test-evidence-collector.md` — References PNG files as evidence targets
- `agents/agency/test-reality-checker.md` — References PNG files for verification

**Docs references:**
- Test/QA agents expect PNG evidence in repo
- Func004 test reports reference sequence PNGs
- Visualization fix reports include `viz_fix.png`

### Current Git Status

All PNG and B64 files are **tracked** in git:
```bash
git ls-files '*.png' '*.b64'
# current_scene.png
# screenshot_latest.png
# viz_fix.png
# scene_check.b64
# artefacts/func004/01_after_seed.png
# artefacts/func004/02_t12s.png
# artefacts/func004/03_t24s.png
# artefacts/func004/remote_scene.png
# artefacts/func004/remote_scene_t0.png
# artefacts/func004/remote_scene_t12.png
# artefacts/func004/remote_scene_t24.png
# artefacts/func004/sequence/000.png
# artefacts/func004/sequence/001.png
# ... (18 sequence files)
```

### Repo Impact

**Size analysis:**
- Root PNGs: ~428 KB
- Artefacts PNGs: ~2–3 MB (estimated from sequence files)
- B64 file: ~196 KB

**Total:** ~3 MB

**Clone time impact:**
- Minimal on fast connections (<1 second)
- Noticeable on slow connections (~5 seconds on 1 Mbps)

**History impact:**
- PNG files are binary — git stores full copy on each change
- Frequent screenshot updates bloat history over time

---

## Options

### Option A: Keep Tracked (Current State)

**Description:** Continue tracking PNG/B64 files in the main repository.

**Pros:**
- **Evidence always available** — Fresh checkout has full test history
- **Zero migration cost** — No code/docs changes required
- **Version history** — Visual changes tracked with source
- **Simple ops** — No external storage setup needed
- **Test agents work** — Evidence collectors find files immediately

**Cons:**
- **Repo bloat** — ~3 MB added (grows with each screenshot)
- **Binary history** — Git stores full copy on each update
- **No retention policy** — Old evidence never cleaned up
- **Large sequence sets** — 18+ files per test sequence

**Impact:** Status quo — repo grows with each screenshot capture.

### Option B: Move to /docs/evidence with Naming Policy

**Description:** Keep tracked, but organize under `docs/evidence/` with structured naming.

**Pros:**
- **Organized structure** — Evidence separated from source
- **Clear naming** — Policy ensures files are discoverable
- **Retention policy** — Can document how long to keep evidence
- **Still versioned** — Evidence history preserved
- **Low migration cost** — Just move files, update references

**Cons:**
- **Still in repo** — 3 MB still added to clones
- **Reference updates** — All code/docs references must be updated
- **Test agent updates** — Evidence collectors need path changes

**Migration steps:**
1. Create `docs/evidence/` directory structure:
   ```
   docs/evidence/
   ├── scenes/
   │   ├── current_scene.png
   │   └── scene_check.b64
   ├── screenshots/
   │   └── screenshot_latest.png
   ├── fixes/
   │   └── viz_fix.png
   └── func004/
       ├── 01_after_seed.png
       ├── 02_t12s.png
       ├── 03_t24s.png
       └── sequence/
           ├── 000.png
           └── ...
   ```
2. Create `docs/evidence/README.md` with naming policy
3. Move all PNG/B64 files to new structure
4. Update `agents/agency/test-evidence-collector.md` with new paths
5. Update `agents/agency/test-reality-checker.md` with new paths
6. Update `backend/controlPlane/services/webStudio/webStudioBrowserCaptureService.js` output path
7. Update func004 test reports with new paths
8. Git mv (not rm + add) to preserve history:
   ```bash
   git mv current_scene.png docs/evidence/scenes/current_scene.png
   git mv screenshot_latest.png docs/evidence/screenshots/screenshot_latest.png
   # etc.
   ```

**Verdict:** **VIABLE** — low risk, improves organization.

### Option C: GitHub Actions Artifacts

**Description:** PNG files generated by CI, downloaded as workflow artifacts.

**Pros:**
- **Clean repo** — No screenshots tracked
- **Fresh evidence** — CI generates on each test run
- **Retention control** — GitHub auto-deletes old artifacts (default 90 days)
- **On-demand download** — Download only when needed

**Cons:**
- **CI setup required** — GitHub Actions workflow needed
- **Test workflow changes** — Tests must upload artifacts
- **Evidence not persistent** — Old evidence deleted after retention period
- **Extra step for review** — Must download artifact to see evidence
- **CI cost** — Artifact storage counts toward GitHub limits

**Migration steps:**
1. Create `.github/workflows/test-evidence.yml`:
   ```yaml
   name: Test Evidence
   on:
     push:
     pull_request:
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Run tests
           run: |
             # Run test suite that generates screenshots
         - uses: actions/upload-artifact@v4
           with:
             name: test-evidence
             path: |
               evidence/*.png
               evidence/*.b64
             retention-days: 30
   ```
2. Update test scripts to output to `evidence/` directory
3. Update `agents/agency/test-evidence-collector.md` to reference CI artifacts
4. Update test agents to download artifacts or work without local files
5. Untrack files: `git rm --cached *.png *.b64 artefacts/func004/*.png`
6. Add patterns to `.gitignore`

**Verdict:** **LONG-TERM** — requires CI workflow changes.

### Option D: External Artifact Storage

**Description:** PNG files stored in external storage (S3, Supabase Storage, etc.).

**Pros:**
- **Clean repo** — No screenshots tracked
- **Unlimited retention** — Keep evidence indefinitely
- **Direct links** — Evidence accessible via URL
- **Scalable** — Storage grows independently of repo

**Cons:**
- **Infrastructure cost** — S3/Supabase storage costs money
- **Setup complexity** — Bucket/container configuration required
- **Auth setup** — Credentials for upload/download
- **Reference updates** — All code/docs must use URLs
- **Test agent updates** — Evidence collectors need URL support

**Migration steps:**
1. Create S3 bucket or Supabase Storage container
2. Configure upload credentials (CI secrets)
3. Create upload script:
   ```bash
   # scripts/upload-evidence.sh
   aws s3 cp evidence/ s3://officebot-evidence/$(date +%Y%m%d)/
   ```
4. Update CI workflow to call upload script
5. Update `agents/agency/test-evidence-collector.md` to reference storage URLs
6. Update test agents to download from URLs or work with URLs only
7. Untrack files: `git rm --cached *.png *.b64 artefacts/func004/*.png`
8. Add patterns to `.gitignore`

**Verdict:** **LONG-TERM** — requires infrastructure setup.

---

## Pros/Cons Summary

| Option | Repo Clean | Evidence Available | Migration Cost | Retention | Recommended |
|--------|------------|-------------------|----------------|-----------|-------------|
| A. Keep Tracked | ❌ | ✅ (immediate) | None | Unlimited | **SHORT-TERM** |
| B. /docs/evidence | ❌ (but organized) | ✅ (immediate) | Low | Unlimited | **MID-TERM** |
| C. CI Artifacts | ✅ | ⚠️ (CI run needed) | Medium | 30–90 days | ❌ |
| D. External Storage | ✅ | ✅ (URL) | High | Unlimited | **LONG-TERM** |

---

## Recommended Decision

**Phase 1 (Immediate — PR #25 blocked):** Keep tracked (Option A)

**Rationale:**
- Test agents depend on PNG evidence
- Func004 test sequence is valuable history
- No migration prep complete
- Untracking breaks evidence collection workflow

**Phase 2 (Next Safe PR):** Implement Option B (Organization)

**Why Option B over C/D:**
- Lowest risk migration
- Preserves evidence history
- No infrastructure cost
- Improves organization without breaking workflow
- Can migrate to C/D later

**Required prep:**
1. Create `docs/evidence/` directory structure
2. Create `docs/evidence/README.md` with naming policy
3. Move files with `git mv` (preserves history)
4. Update test agent references
5. Update capture service output path

**Phase 3 (Future):** Consider Option D (External Storage)

**When to migrate:**
- When repo size becomes concern
- When evidence volume grows significantly
- When infrastructure budget available

---

## Migration Steps (Option B)

### Step 1: Create Directory Structure

```bash
cd /workspace/officebot
mkdir -p docs/evidence/scenes
mkdir -p docs/evidence/screenshots
mkdir -p docs/evidence/fixes
mkdir -p docs/evidence/func004/sequence
```

### Step 2: Create Naming Policy

**`docs/evidence/README.md`:**
```markdown
# Visual Evidence

This directory contains visual evidence artifacts: screenshots, scene captures, and test sequences.

## Structure

```
docs/evidence/
├── scenes/           # Scene state captures
│   ├── current_scene.png
│   └── scene_check.b64
├── screenshots/      # Latest screenshots
│   └── screenshot_latest.png
├── fixes/            # Bug fix verification
│   └── viz_fix.png
└── func004/          # Func004 test evidence
    ├── 01_after_seed.png
    ├── 02_t12s.png
    ├── 03_t24s.png
    └── sequence/
        ├── 000.png
        └── ...
```

## Naming Policy

### Scenes
- `current_scene.png` — Latest scene capture (updated by capture service)
- `scene_check.b64` — Base64 scene dump (for debugging)

### Screenshots
- `screenshot_latest.png` — Most recent screenshot (updated by capture service)

### Fixes
- `<bug-id>_<description>.png` — Bug fix verification (e.g., `viz_fix_lighting.png`)

### Test Sequences
- `<test-id>_<step>.png` — Test sequence frames (e.g., `func004_000.png`)
- `<test-id>_<timepoint>.png` — Time-based captures (e.g., `func004_t12s.png`)

## Retention

- **Active evidence:** Keep indefinitely (scenes, screenshots)
- **Fix verification:** Keep for 6 months after fix
- **Test sequences:** Keep for 3 months after test completion

## Updating

Capture service updates:
- `scenes/current_scene.png` — On each scene change
- `screenshots/screenshot_latest.png` — On each screenshot request

Manual additions:
- `fixes/*.png` — When verifying bug fixes
- `func004/*.png` — When running func004 tests
```

### Step 3: Move Files with Git

```bash
cd /workspace/officebot

# Move root PNGs
git mv current_scene.png docs/evidence/scenes/current_scene.png
git mv screenshot_latest.png docs/evidence/screenshots/screenshot_latest.png
git mv viz_fix.png docs/evidence/fixes/viz_fix.png
git mv scene_check.b64 docs/evidence/scenes/scene_check.b64

# Move artefacts/func004 PNGs
git mv artefacts/func004/01_after_seed.png docs/evidence/func004/01_after_seed.png
git mv artefacts/func004/02_t12s.png docs/evidence/func004/02_t12s.png
git mv artefacts/func004/03_t24s.png docs/evidence/func004/03_t24s.png
git mv artefacts/func004/remote_scene.png docs/evidence/func004/remote_scene.png
git mv artefacts/func004/remote_scene_t0.png docs/evidence/func004/remote_scene_t0.png
git mv artefacts/func004/remote_scene_t12.png docs/evidence/func004/remote_scene_t12.png
git mv artefacts/func004/remote_scene_t24.png docs/evidence/func004/remote_scene_t24.png

# Move sequence files
for i in $(seq -w 0 17); do
  git mv artefacts/func004/sequence/${i}.png docs/evidence/func004/sequence/${i}.png
done
```

### Step 4: Update Capture Service

**`backend/controlPlane/services/webStudio/webStudioBrowserCaptureService.js`:**

Find screenshot output paths and update:
```javascript
// Old
const outputPath = path.join(ROOT, 'screenshot_latest.png');

// New
const outputPath = path.join(ROOT, 'docs', 'evidence', 'screenshots', 'screenshot_latest.png');
```

Similarly for `current_scene.png`:
```javascript
// Old
const scenePath = path.join(ROOT, 'current_scene.png');

// New
const scenePath = path.join(ROOT, 'docs', 'evidence', 'scenes', 'current_scene.png');
```

### Step 5: Update Test Agents

**`agents/agency/test-evidence-collector.md`:**
```markdown
## Evidence Locations

- Current scene: `docs/evidence/scenes/current_scene.png`
- Latest screenshot: `docs/evidence/screenshots/screenshot_latest.png`
- Scene dump: `docs/evidence/scenes/scene_check.b64`
- Func004 sequence: `docs/evidence/func004/sequence/*.png`
```

**`agents/agency/test-reality-checker.md`:**
```markdown
## Visual Verification

Check `docs/evidence/` for:
- Scene captures
- Test sequences
- Fix verification images
```

### Step 6: Update Func004 Reports

Search for references to old paths and update:
```bash
# Find all references
grep -r "artefacts/func004" docs/ agents/ --include="*.md"
```

Update each reference to new path:
```markdown
<!-- Old -->
See artefacts/func004/sequence/000.png

<!-- New -->
See docs/evidence/func004/sequence/000.png
```

### Step 7: Verify and Commit

```bash
# Verify moves
git status
# Should show renames, not deletions/additions

# Commit
git commit -m "docs: move visual evidence to docs/evidence/ with naming policy

- scenes/ — Scene state captures (current_scene.png, scene_check.b64)
- screenshots/ — Latest screenshots (screenshot_latest.png)
- fixes/ — Bug fix verification (viz_fix.png)
- func004/ — Func004 test evidence

Naming policy documented in docs/evidence/README.md
Capture service paths updated in webStudioBrowserCaptureService.js
Test agent references updated in test-evidence-collector.md, test-reality-checker.md
"
```

---

## Risks

### Risk 1: Broken References

**If references not updated:**
- Test agents fail to find evidence
- Capture service writes to old location
- Confusion about evidence location

**Mitigation:**
- Update ALL references before committing
- Test capture service after move
- Test evidence collector agent after move
- Search for all references: `grep -r "current_scene.png" .`

### Risk 2: Lost History

**If files moved with rm + add instead of git mv:**
- Git history lost for each file
- Cannot trace when evidence was captured

**Mitigation:**
- Use `git mv` NOT `rm` + `add`
- Verify history preserved: `git log --follow docs/evidence/scenes/current_scene.png`

### Risk 3: Capture Service Failure

**If capture service path update has bug:**
- Screenshots fail silently
- Evidence not updated

**Mitigation:**
- Test capture service manually after update
- Add error logging for failed captures
- Verify screenshot created after test run

---

## Required Code/Doc Changes

### Code Changes
1. `backend/controlPlane/services/webStudio/webStudioBrowserCaptureService.js` (update output paths)

### Doc Changes
1. `docs/evidence/README.md` (NEW — naming policy)
2. `agents/agency/test-evidence-collector.md` (update paths)
3. `agents/agency/test-reality-checker.md` (update paths)
4. Func004 test reports (update paths)

### Git Changes
1. `git mv` all PNG/B64 files to `docs/evidence/`
2. Single commit for reorganization

---

## Decision Record

**Decision:** **DEFERRED** — Option A (Keep Tracked) for PR #25

**Rationale:**
- Migration prep (Option B) not complete
- Test agents depend on current paths
- Untracking breaks evidence workflow
- Organization can be done in separate PR

**Next Action:**
1. Create `docs/evidence/` structure (Phase 2)
2. Create naming policy (Phase 2)
3. Move files with `git mv` (Phase 2)
4. Update capture service (Phase 2)
5. Update test agents (Phase 2)
6. Test evidence workflow (Phase 2)
7. Propose cleanup PR after verification (Phase 3)

**Owner Approval Required:**
- [ ] Confirm Option B as target migration
- [ ] Approve directory structure
- [ ] Approve naming policy
- [ ] Approve capture service path changes
- [ ] Set timeline for Phase 2/3

---

**References:**
- `/output/officebot-remaining-artifacts-architecture-decision-review.md`
- `docs/tracked-artifact-cleanup-manifest.md`
- `agents/agency/test-evidence-collector.md`
- `agents/agency/test-reality-checker.md`
- `backend/controlPlane/services/webStudio/webStudioBrowserCaptureService.js`
