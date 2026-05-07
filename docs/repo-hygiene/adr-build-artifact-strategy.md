# ADR: Build Artifact Strategy

**Date:** 2026-05-07  
**Status:** Proposed  
**Deciders:** OfficeBot Maintainer  
**Context:** Post PR #24 merge, pre-PR #25 cleanup

---

## Summary

This ADR defines the storage and distribution strategy for Unity WebGL build artifacts currently tracked in the OfficeBot repository.

**Files in scope:**
- `Build/office.wasm` (33,507,313 B — 33.5 MB)
- `Build/office.data` (6,448,798 B — 6.4 MB)
- `Build/office.framework.js` (427,217 B — 427 KB)
- `Build/office.loader.js` (26,982 B — 27 KB)

**Total size:** 40.4 MB

---

## Current Role

### WebGL Demo Evidence

The `Build/` directory contains Unity WebGL build output required for:

1. **`index.html` demo** — Root `index.html` (19,500 B) references `Build/office.loader.js`
2. **`scripts/unity-loader.js`** — Verifies build presence:
   ```javascript
   const BUILD_PATH = path.join(ROOT, 'Build', 'office.loader.js');
   ```
3. **Documentation references:**
   - `ALGORITHM.md` — References `Build/` as Unity output directory
   - `AUTOBUILD_SETUP.md` — Documents build process
4. **Stakeholder demos** — Working WebGL demo expected in repo root

### Current Git Status

All four files are **tracked** in git:
```bash
git ls-files Build/*
# Build/office.data
# Build/office.framework.js
# Build/office.loader.js
# Build/office.wasm
```

### Repo Impact

**Size analysis:**
- `office.wasm`: 33.5 MB (83% of build size)
- `office.data`: 6.4 MB (16% of build size)
- `office.framework.js`: 427 KB (1%)
- `office.loader.js`: 27 KB (<1%)

**Total repo size impact:** ~40 MB added to every clone

**Clone time impact:**
- On 10 Mbps connection: ~32 seconds for build artifacts alone
- On 1 Mbps connection: ~5.5 minutes for build artifacts alone

---

## Options

### Option A: Keep Tracked (Current State)

**Description:** Continue tracking `Build/*` files in the main repository.

**Pros:**
- **Demo always works** — Fresh checkout has working WebGL demo immediately
- **Zero migration cost** — No code/docs changes required
- **Version history** — Build artifacts versioned with source
- **Simple ops** — No deployment step needed

**Cons:**
- **Repo bloat** — 40 MB added to every clone
- **Slow clones** — Significant download time on slow connections
- **No build verification** — Tracked builds may not match current source
- **Merge conflicts** — Binary files cause conflicts on parallel builds
- **History bloat** — Every build update adds 40 MB to git history

**Impact:** Status quo — repo continues growing with each build update.

### Option B: GitHub Releases Artifact

**Description:** Remove `Build/*` from repo, publish as GitHub Releases assets.

**Pros:**
- **Clean repo** — 40 MB removed from main repository
- **Fast clones** — Source-only checkout is quick
- **Versioned releases** — Each release has matching build artifacts
- **Download on demand** — Users download builds only when needed
- **Build verification** — Release builds explicitly tagged/verified

**Cons:**
- **Demo broken on checkout** — `index.html` fails without build files
- **Manual download required** — Users must download from Releases
- **Extra deployment step** — Maintainer must upload builds to releases
- **Docs updates needed** — All references to `Build/` must be updated

**Migration steps:**
1. Create GitHub Release workflow (manual or CI)
2. Upload `Build/*` as release assets
3. Update `index.html` to download from release or show "Download Required" message
4. Update `scripts/unity-loader.js` to check for local build or prompt download
5. Update `README.md` with release download instructions
6. Update `ALGORITHM.md`, `AUTOBUILD_SETUP.md` with release strategy
7. Untrack files: `git rm --cached Build/*`
8. Add `Build/*` to `.gitignore`

**Verdict:** **VIABLE** — requires `index.html` and loader updates.

### Option C: Separate Release Branch

**Description:** Move `Build/*` to separate `releases/` or `demos/` branch.

**Pros:**
- **Clean main branch** — Source code separate from builds
- **Demo preserved** — Checkout `releases` branch for demo
- **No external hosting** — Still on GitHub, just different branch
- **Version tags** — Tag releases on `releases` branch

**Cons:**
- **Two-branch workflow** — Users must checkout two branches for full demo
- **Sync complexity** — Keep `main` and `releases` in sync
- **Docs updates needed** — Reference `releases/` branch for builds
- **Still 40 MB** — Builds still in git, just different branch

**Migration steps:**
1. Create `releases` branch from current main
2. On `main`: `git rm --cached Build/*`, add to `.gitignore`
3. On `releases`: Keep `Build/*` tracked
4. Update `README.md` with two-branch checkout instructions
5. Update `index.html` to reference relative `Build/` (works on `releases` branch)
6. Create release tags on `releases` branch
7. Document workflow: "For demo: `git checkout releases`, for dev: `git checkout main`"

**Verdict:** **COMPLEX** — two-branch workflow may confuse users.

### Option D: CI-Generated Artifact

**Description:** Build artifacts generated by GitHub Actions on push/tag, downloaded on demand.

**Pros:**
- **Clean repo** — No build artifacts tracked
- **Always fresh** — Builds match current source
- **Automated** — No manual upload required
- **On-demand download** — CI provides download URL
- **Build verification** — CI confirms successful build

**Cons:**
- **CI setup required** — GitHub Actions workflow needed
- **Build time cost** — CI minutes consumed on each build
- **Demo not immediate** — Must wait for CI or download artifact
- **Local build dependency** — Requires Unity to rebuild locally
- **Docs updates needed** — Document CI artifact download

**Migration steps:**
1. Create `.github/workflows/build-unity.yml`:
   ```yaml
   name: Build Unity WebGL
   on:
     push:
       tags: ['v*']
       branches: [main]
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Build Unity WebGL
           run: |
             # Unity build commands (requires Unity license)
             # Or use pre-built output if Unity not available
         - uses: actions/upload-artifact@v4
           with:
             name: officebot-webgl-build
             path: Build/
   ```
2. Update `index.html` to either:
   - Download artifact on page load
   - Show "Build in Progress" or "Download Required" message
3. Update `scripts/unity-loader.js` to check for artifact download
4. Update `README.md` with CI artifact download instructions
5. Untrack files: `git rm --cached Build/*`
6. Add `Build/*` to `.gitignore`

**Verdict:** **LONG-TERM GOAL** — requires Unity CI setup (complex).

---

## Pros/Cons Summary

| Option | Repo Clean | Demo Works | Migration Cost | CI Required | Recommended |
|--------|------------|------------|----------------|-------------|-------------|
| A. Keep Tracked | ❌ | ✅ (immediate) | None | No | **SHORT-TERM** |
| B. GitHub Releases | ✅ | ⚠️ (download needed) | Medium | No | **MID-TERM** |
| C. Release Branch | ⚠️ (different branch) | ✅ (on releases) | Medium | No | ❌ |
| D. CI-Generated | ✅ | ⚠️ (CI delay) | High | Yes | **LONG-TERM** |

---

## Size/Repo Impact

### Current State (Option A)

**Repo size growth:**
- Initial commit with `Build/*`: +40 MB
- Each build update: +40 MB (git stores full copy)
- After 10 build updates: ~400 MB in git history

**Clone size:**
- Current repo: ~50 MB (estimated, including history)
- With `Build/*`: +40 MB per shallow clone
- With `Build/*` + history: +400 MB+ over time

### After Cleanup (Options B/C/D)

**Repo size:**
- Source-only: ~10 MB (estimated)
- No build artifacts in history
- Fast clones: ~10 MB vs. ~50 MB

**Trade-off:**
- 40 MB saved per clone
- Demo requires extra step (download/checkout)

---

## CI/CD Implications

### Option A: No CI Required

**Current state:** Builds done locally, committed manually.

**Implications:**
- No CI cost
- Manual deployment
- Risk of mismatched builds (source/build drift)

### Option B: Manual Release Upload

**CI required:** No — manual upload to GitHub Releases.

**Workflow:**
1. Build locally: `Unity Editor → Build → Build/`
2. Create GitHub Release: `github.com/owner/officebot/releases/new`
3. Upload `Build/*` as assets
4. Tag release: `v1.0.0`

**Implications:**
- Manual step required
- No CI cost
- Explicit release verification

### Option C: Branch Management

**CI required:** No — but branch sync required.

**Workflow:**
1. Develop on `main`
2. Before release: merge `main` → `releases`
3. Build on `releases` branch
4. Commit `Build/*` on `releases`
5. Tag release on `releases`

**Implications:**
- Two-branch management overhead
- Risk of drift between branches
- No CI cost

### Option D: Full CI/CD

**CI required:** Yes — GitHub Actions with Unity.

**Challenges:**
- Unity requires license (paid for CI)
- Large Unity Docker image (~20 GB)
- Long build times (10–30 minutes)
- CI minute costs (expensive)

**Alternative:**
- Build locally, upload to CI artifact
- Use self-hosted runner with Unity installed
- Use Unity Cloud Build (separate service)

**Implications:**
- High setup complexity
- Ongoing CI costs
- Automated, verified builds

---

## Recommended Decision

**Phase 1 (Immediate — PR #25 blocked):** Keep tracked (Option A)

**Rationale:**
- WebGL demo is key stakeholder deliverable
- No migration prep complete
- Untracking breaks `index.html` immediately
- CI setup (Option D) is weeks of work

**Phase 2 (Next Safe PR):** Prepare Option B migration

**Why Option B over D:**
- Lower complexity (no Unity CI required)
- Manual release upload is acceptable for now
- GitHub Releases is free, stable, well-documented
- Can migrate to Option D later

**Required prep:**
1. Create first GitHub Release with current `Build/*`
2. Update `index.html` to handle missing builds gracefully
3. Update `scripts/unity-loader.js` to check for local builds
4. Update `README.md` with release download instructions
5. Update `ALGORITHM.md`, `AUTOBUILD_SETUP.md` with release strategy
6. Test fresh checkout + download flow

**Phase 3 (Future Cleanup PR):** Untrack after Option B verified

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

---

## Migration Steps (Option B)

### Step 1: Create GitHub Release

1. Go to `github.com/owner/officebot/releases/new`
2. Tag: `v1.0.0` (or current version)
3. Title: "OfficeBot v1.0.0 — Initial WebGL Release"
4. Upload assets:
   - `Build/office.data` (6.4 MB)
   - `Build/office.framework.js` (427 KB)
   - `Build/office.loader.js` (27 KB)
   - `Build/office.wasm` (33.5 MB)
5. Publish release

### Step 2: Update index.html

**Current behavior (assumed):**
```html
<script src="Build/office.loader.js"></script>
```

**Updated behavior (graceful degradation):**
```html
<div id="unity-container">
  <div id="unity-placeholder" style="display:none">
    <h2>OfficeBot WebGL Demo</h2>
    <p>Build artifacts not found. Download from 
       <a href="https://github.com/owner/officebot/releases/latest">latest release</a>.
    </p>
    <p>After download, extract to <code>Build/</code> directory and refresh.</p>
  </div>
  <div id="unity-content"></div>
</div>

<script>
  // Check if build exists
  fetch('Build/office.loader.js', {method: 'HEAD'})
    .then(response => {
      if (response.ok) {
        // Load Unity
        const script = document.createElement('script');
        script.src = 'Build/office.loader.js';
        document.getElementById('unity-content').appendChild(script);
      } else {
        // Show download message
        document.getElementById('unity-placeholder').style.display = 'block';
      }
    })
    .catch(() => {
      document.getElementById('unity-placeholder').style.display = 'block';
    });
</script>
```

### Step 3: Update unity-loader.js

**`scripts/unity-loader.js`:**
```javascript
const fs = require('fs');
const path = require('path');

const BUILD_PATH = path.join(ROOT, 'Build', 'office.loader.js');
const RELEASE_URL = 'https://github.com/owner/officebot/releases/latest';

function checkBuildExists() {
  return fs.existsSync(BUILD_PATH);
}

function ensureBuild() {
  if (!checkBuildExists()) {
    console.error('Build artifacts not found.');
    console.error(`Download from: ${RELEASE_URL}`);
    console.error('Extract to Build/ directory.');
    process.exit(1);
  }
}

module.exports = { checkBuildExists, ensureBuild };
```

### Step 4: Update README.md

**Add section:**
```markdown
## WebGL Demo

The OfficeBot WebGL demo requires build artifacts (40 MB total).

### Option 1: Download from Releases (Recommended)

1. Go to [Releases](https://github.com/owner/officebot/releases)
2. Download latest release assets:
   - `office.data`
   - `office.framework.js`
   - `office.loader.js`
   - `office.wasm`
3. Create `Build/` directory in repo root
4. Extract assets to `Build/`
5. Open `index.html` in browser

### Option 2: Build Locally (Advanced)

Requires Unity Editor with WebGL build support:

1. Open `UnityProject/` in Unity
2. File → Build Settings → WebGL
3. Set build path to `Build/`
4. Click Build

### For Developers

If you don't need the WebGL demo, you can skip the build artifacts:

```bash
git clone <repo>
# Skip Build/ download — source code works without it
```
```

### Step 5: Update Docs

**`ALGORITHM.md`:**
```markdown
## Build Output

Unity WebGL builds are published to [GitHub Releases](https://github.com/owner/officebot/releases).

For local development, download the latest release and extract to `Build/`.
```

**`AUTOBUILD_SETUP.md`:**
```markdown
## Build Artifacts

Build artifacts (`Build/office.wasm`, etc.) are not tracked in git.

Download from [Releases](https://github.com/owner/officebot/releases) or build locally with Unity.
```

### Step 6: Untrack Files

```bash
git rm --cached Build/office.data
git rm --cached Build/office.framework.js
git rm --cached Build/office.loader.js
git rm --cached Build/office.wasm
```

### Step 7: Update .gitignore

```
# Unity WebGL build artifacts (download from Releases)
Build/*.data
Build/*.framework.js
Build/*.loader.js
Build/*.wasm
```

### Step 8: Test Fresh Checkout

```bash
# In clean directory
git clone <repo> officebot-test
cd officebot-test
# Verify Build/ missing
ls Build/  # Should not exist or be empty
# Open index.html — should show download message
# Download from Releases, extract to Build/
# Refresh index.html — should load Unity demo
```

---

## Risks

### Risk 1: Demo Breakage

**If untracked without `index.html` update:**
- `index.html` fails silently or shows error
- Stakeholders cannot see demo
- Project appears broken

**Mitigation:**
- Update `index.html` BEFORE untracking
- Test fresh checkout flow
- Add graceful degradation (download message)

### Risk 2: Release Upload Failure

**If manual upload forgotten:**
- No build artifacts available
- Demo broken for all users

**Mitigation:**
- Add release upload to release checklist
- Consider CI automation (Option D) long-term
- Keep local backup of last known-good build

### Risk 3: Version Drift

**If releases not updated with source changes:**
- Build artifacts don't match source
- Demo shows outdated features

**Mitigation:**
- Tag releases with version numbers
- Document release process
- Consider CI auto-build on tags (Option D)

### Risk 4: Large Download Barrier

**If 40 MB download deters users:**
- Users may not download build
- Demo never seen

**Mitigation:**
- Compress artifacts (zip file)
- Consider CDN hosting for faster downloads
- Provide demo video/screenshots as alternative

---

## Required Code/Doc Changes

### Code Changes
1. `index.html` (add graceful degradation)
2. `scripts/unity-loader.js` (add build check)
3. `.gitignore` (add `Build/*` patterns)

### Doc Changes
1. `README.md` (add WebGL download section)
2. `ALGORITHM.md` (update build reference)
3. `AUTOBUILD_SETUP.md` (update build reference)
4. Release notes template (for future releases)

### Git Changes
1. `git rm --cached Build/*`
2. Commit code/doc changes first
3. Separate commit for untracking

---

## Decision Record

**Decision:** **DEFERRED** — Option A (Keep Tracked) for PR #25

**Rationale:**
- Migration prep (Option B) not complete
- `index.html` update required before untracking
- Release must be created and tested first
- Untracking now breaks WebGL demo

**Next Action:**
1. Create GitHub Release with current `Build/*` (Phase 2)
2. Update `index.html` for graceful degradation (Phase 2)
3. Update docs (Phase 2)
4. Test fresh checkout + download flow (Phase 2)
5. Propose cleanup PR after verification (Phase 3)

**Owner Approval Required:**
- [ ] Confirm Option B as target migration
- [ ] Approve GitHub Release creation
- [ ] Approve `index.html` update
- [ ] Approve docs update scope
- [ ] Set timeline for Phase 2/3

---

**References:**
- `/output/officebot-remaining-artifacts-architecture-decision-review.md`
- `docs/tracked-artifact-cleanup-manifest.md`
- `ALGORITHM.md`
- `AUTOBUILD_SETUP.md`
- `scripts/unity-loader.js`
- `index.html`
