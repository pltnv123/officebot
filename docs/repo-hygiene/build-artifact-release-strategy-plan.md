# officebot build artifact release strategy plan

## Current role of Build artifacts

Tracked build artifacts found: **4**.

- `Build/office.data` — 6448798 bytes, refs: 6, risk: HIGH
- `Build/office.framework.js` — 427217 bytes, refs: 7, risk: HIGH
- `Build/office.loader.js` — 26982 bytes, refs: 7, risk: HIGH
- `Build/office.wasm` — 33507313 bytes, refs: 6, risk: HIGH

Build references found in:
- `.github/workflows/unity-webgl-deploy.yml`
- `.gitignore`
- `AGENTS.md.bak`
- `ALGORITHM.md`
- `AUTOBUILD_SETUP.md`
- `agents/agency/game-development/unreal-engine/unreal-multiplayer-architect.md`
- `agents/agency/gamedev-unreal-multiplayer-architect.md`
- `artefacts/func004/browser_console.log`
- `artefacts/func004/sequence/console.log`
- `artefacts/func004/sequence_console.log`
- `docs/repo-hygiene.md`
- `docs/repo-hygiene/adr-build-artifact-strategy.md`
- `docs/repo-hygiene/build-artifact-reference-map.md`
- `docs/repo-hygiene/next-safe-pr-recommendation.md`
- `docs/repo-hygiene/phase-2-execution-plan.md`
- `docs/repo-hygiene/pr25-readiness-checklist.md`
- `docs/tracked-artifact-cleanup-manifest.md`
- `scripts/ops/agent_self_check.sh`
- `scripts/ops/auto_heal.sh`
- `scripts/unity-loader.js`
- `third_party/agency-agents/game-development/unreal-engine/unreal-multiplayer-architect.md`
- `third_party/ccgs/agents/performance-analyst.md`
- `third_party/ccgs/docs/agent-roster.md`

## Why they are demo/deploy critical

The `Build/` outputs appear to be Unity/web deployment artifacts referenced by loader/index/deploy paths. Removing or untracking them before a replacement path is tested could break demos, Pages/deploy, or local verification.

## Why they should not be removed now

- No release asset download flow has been implemented and verified.
- No Pages artifact deployment replacement has been verified.
- Rollback would require restoring large artifacts and possibly history-sensitive paths.

## Options

A. Keep tracked temporarily — safest short term, repo remains heavy.
B. GitHub Release assets — good for versioned demos; requires release creation/upload approval.
C. GitHub Pages artifact deployment — good for deploy pipeline; requires workflow changes approval.
D. External storage/CDN — scalable but adds credentials/ops dependencies.

## Recommended staged migration

1. Docs-only owner decision checklist.
2. Release/deploy design doc with exact asset names and rollback.
3. Implement download/deploy fallback in a separate approved PR.
4. Verify fresh checkout and demo path.
5. Only then propose limited untrack PR for exact Build paths.

## Approval gates

- Approval to create releases/upload artifacts.
- Approval to modify workflows/deploy code.
- Approval for exact `git rm --cached` paths.

## Rollback plan

Revert the migration PR and restore tracked artifacts from `origin/main`/prior commit if the replacement path fails.
