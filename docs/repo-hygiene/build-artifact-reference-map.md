# OfficeBot Build Artifact Reference Map

**Date:** 2026-05-07  
**Scan Target:** Build artifacts on `origin/main` (post-PR25)

---

## Executive Summary

**Total Files Scanned:** 4 Build artifacts  
**Total Size:** 40.4 MB  
**Total References Found:** 12+ across docs, scripts, agents  
**Risk Level:** HIGH — Demo-critical artifacts  
**Cleanup Status:** DEFERRED by ADR (PR25) — Option A → Option B

---

## Files in Scope

| File | Size | SHA | Tracked | Status |
|------|------|-----|---------|--------|
| `Build/office.data` | 6.4 MB | `a5fe8ea3` | ✅ Yes | Unity data blob |
| `Build/office.framework.js` | 427 KB | `f88e45d0` | ✅ Yes | Unity framework |
| `Build/office.loader.js` | 27 KB | `f10111d1` | ✅ Yes | Unity loader |
| `Build/office.wasm` | 33.5 MB | `571937d5` | ✅ Yes | Unity WASM binary |

**Total:** 40.4 MB (83% WASM, 16% data, 1% framework/loader)

---

## Reference Analysis

### Build/office.loader.js (3+ references)

**Consumers:**
- `index.html` — Script tag: `<script src="Build/office.loader.js"></script>`
- `scripts/unity-loader.js` — Verifies build presence: `const BUILD_PATH = path.join(ROOT, 'Build', 'office.loader.js')`
- `docs/repo-hygiene/adr-build-artifact-strategy.md` — ADR documentation
- `docs/repo-hygiene/next-safe-pr-recommendation.md` — Recommendation reference

**Risk Level:** 🔴 **CRITICAL** — Demo entry point

---

### Build/office.wasm (1+ references)

**Consumers:**
- `docs/tracked-artifact-cleanup-manifest.md` — Manifest reference (1 ref)
- `docs/repo-hygiene/adr-build-artifact-strategy.md` — ADR documentation

**Risk Level:** 🟡 **MEDIUM** — Largest file, but referenced indirectly via loader

---

### Build/office.data (1+ references)

**Consumers:**
- `docs/tracked-artifact-cleanup-manifest.md` — Manifest reference (1 ref)
- `docs/repo-hygiene/adr-build-artifact-strategy.md` — ADR documentation

**Risk Level:** 🟡 **MEDIUM** — Data blob, required for Unity

---

### Build/office.framework.js (3+ references)

**Consumers:**
- `index.html` — Implicitly loaded by loader
- `scripts/unity-loader.js` — Build verification
- `docs/repo-hygiene/adr-build-artifact-strategy.md` — ADR documentation
- `docs/tracked-artifact-cleanup-manifest.md` — Manifest reference

**Risk Level:** 🟡 **MEDIUM** — Framework required for Unity

---

## Documentation References

### Core Docs
| File | References | Context |
|------|------------|---------|
| `ALGORITHM.md` | 1+ | Build output directory reference |
| `AUTOBUILD_SETUP.md` | 1+ | Build process documentation |
| `docs/repo-hygiene.md` | 1+ | Hygiene policy reference |
| `docs/tracked-artifact-cleanup-manifest.md` | 4 | Cleanup candidate documentation |

### ADR Documentation
| File | References | Context |
|------|------------|---------|
| `docs/repo-hygiene/adr-build-artifact-strategy.md` | 30+ | Full strategy ADR |
| `docs/repo-hygiene/next-safe-pr-recommendation.md` | 5+ | Cleanup recommendation |
| `docs/repo-hygiene/pr25-readiness-checklist.md` | 5+ | Readiness checklist |

### Agent Documentation
| File | References | Context |
|------|------------|---------|
| `agents/agency/game-development/unreal-engine/unreal-multiplayer-architect.md` | 1+ | Build artifact mention |
| `agents/agency/gamedev-unreal-multiplayer-architect.md` | 1+ | Build artifact mention |
| `third_party/agency-agents/game-development/unreal-engine/unreal-multiplayer-architect.md` | 1+ | Build artifact mention |
| `third_party/ccgs/agents/performance-analyst.md` | 1+ | Build artifact mention |
| `third_party/ccgs/docs/agent-roster.md` | 1+ | Build artifact mention |

---

## Deployment Assumptions

### WebGL Demo
- `index.html` expects `Build/office.loader.js` at relative path
- Demo breaks if `Build/` missing without graceful degradation
- Stakeholder demos expect working WebGL immediately after clone

### GitHub Pages
- No explicit GitHub Pages configuration found
- Demo appears to be local/file-based (`index.html` opened in browser)
- No CI/CD deployment workflow detected

### Unity WebGL
- Build output from Unity Editor
- 4 files required for WebGL to function
- `.wasm` file is 83% of total size

---

## CSV Export

```csv
path,category,tracked,size_bytes,reference_count,referenced_by,likely_role,risk_level,proposed_future_action,approval_required
Build/office.data,build_artifact,yes,6448798,2,docs/ADR,Unity data blob,MEDIUM,Option B: GitHub Release,yes
Build/office.framework.js,build_artifact,yes,427217,4,docs/scripts/ADR,Unity framework,MEDIUM,Option B: GitHub Release,yes
Build/office.loader.js,build_artifact,yes,26982,4,index.html/scripts/docs/ADR,Unity entry point,CRITICAL,Option B: GitHub Release,yes
Build/office.wasm,build_artifact,yes,33507313,2,docs/ADR,Unity WASM binary,MEDIUM,Option B: GitHub Release,yes
```

---

## Key Findings

### 1. Demo-Critical Artifacts
All 4 Build files are required for WebGL demo:
- `index.html` directly references `Build/office.loader.js`
- `scripts/unity-loader.js` verifies build presence
- Untracking without migration breaks demo immediately

### 2. ADR Decision Confirmed
PR25 ADR (`adr-build-artifact-strategy.md`) correctly defers cleanup:
- GitHub Release must be created first
- `index.html` needs graceful degradation
- `scripts/unity-loader.js` needs download URL
- Docs need updates (`README.md`, `ALGORITHM.md`, `AUTOBUILD_SETUP.md`)

### 3. Size Impact
- **Current:** 40.4 MB added to every clone
- **After cleanup:** ~10 MB (source only)
- **Trade-off:** Demo requires download step

---

## Proposed Future Action (After Approval)

### Phase 2 Prep Work
1. Create GitHub Release with current `Build/*` files
2. Update `index.html` for graceful degradation
3. Update `scripts/unity-loader.js` with build check + download URL
4. Update docs (`README.md`, `ALGORITHM.md`, `AUTOBUILD_SETUP.md`)

### Phase 3 Cleanup (After Prep Verified)
1. Test fresh checkout + download flow
2. Untrack files: `git rm --cached Build/*`
3. Add to `.gitignore`: `Build/*.data`, `Build/*.framework.js`, `Build/*.loader.js`, `Build/*.wasm`

---

## Why No Move Happens Now

1. **Demo Breakage Risk** — `index.html` fails without `Build/`
2. **No Graceful Degradation** — No download message implemented
3. **No GitHub Release** — Artifacts not published yet
4. **ADR Deferral** — PR25 explicitly defers until prep complete

---

## Rollback Strategy

If cleanup breaks demo:
```bash
# Revert untrack commit
git revert <cleanup-PR-sha>

# Re-track files
git add Build/
git commit -m "Restore Build artifacts after rollback"
```

---

**Map generated by:** Hermes Agent  
**Map path:** `/output/officebot-build-artifact-reference-map.md`  
**Host path:** `/home/hermes/.hermes/cache/documents/officebot-build-artifact-reference-map.md`
