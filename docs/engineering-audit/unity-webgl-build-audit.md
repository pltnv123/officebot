# officebot Unity/WebGL and Build audit

## Current build artifact role
Tracked `Build/` files: 4.
- `Build/office.data` — 6448798 bytes
- `Build/office.framework.js` — 427217 bytes
- `Build/office.loader.js` — 26982 bytes
- `Build/office.wasm` — 33507313 bytes

## Deploy-critical files
`*.loader.js`, `*.framework.js`, `*.wasm`, and `*.data` are likely deploy-critical for WebGL.

## Build references
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
- `docs/repo-hygiene/build-artifact-release-strategy-plan.md`
- `docs/repo-hygiene/ci-cd-readonly-audit.md`
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

## GitHub Pages/deploy assumptions
Build artifacts may be published directly from tracked files. This must be confirmed before any untrack/migration.

## Risks of untracking Build
- Demo can 404 on loader/data/wasm.
- Pages deploy may publish incomplete app.
- Fresh checkout loses ready-to-serve demo.
- Rollback requires exact file restoration.

## Release alternatives
- Keep tracked short-term.
- GitHub Releases for versioned binary assets.
- GitHub Pages artifact deployment.
- External object storage/CDN.
- CI-generated build artifacts.

## Required owner decisions
Choose release/deploy source of truth and whether GitHub Releases/Pages workflows may be modified.
