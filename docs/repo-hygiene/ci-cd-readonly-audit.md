# officebot CI/CD read-only audit

## Scope

Read-only audit only. No workflow, source, runtime, build, or settings changes were made.

## Baseline

- Repo: `pltnv123/officebot`
- Main SHA: `3f5395e21fd05eb4fc9cfbe496e3f6bbaf446d79`
- Workflow files on main: 2

## Workflow files

- `.github/workflows/unity-generate-alf.yml`
- `.github/workflows/unity-webgl-deploy.yml`

## `gh workflow list --all`

```text
Unity Generate ALF	active	240494913
Unity WebGL Build & Deploy	active	240217229
.github/workflows/webgl-build.yml	active	246970337
```

## Latest workflow runs

```json
[{"conclusion":"failure","createdAt":"2026-05-07T12:10:01Z","databaseId":25494901067,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25494901067","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-07T11:54:12Z","databaseId":25494178361,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25494178361","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-07T11:19:24Z","databaseId":25492633561,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25492633561","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-06T09:33:44Z","databaseId":25427507934,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25427507934","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-05T20:44:07Z","databaseId":25401261256,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25401261256","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-05T20:05:29Z","databaseId":25399420724,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25399420724","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-05T19:39:18Z","databaseId":25398160585,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25398160585","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"cancelled","createdAt":"2026-05-05T19:22:31Z","databaseId":25397368869,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25397368869","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-05T19:15:56Z","databaseId":25397057494,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25397057494","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"cancelled","createdAt":"2026-05-05T18:43:35Z","databaseId":25395446819,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25395446819","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-05T18:40:30Z","databaseId":25395294986,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25395294986","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-05T16:20:41Z","databaseId":25388477363,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25388477363","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-05T14:16:49Z","databaseId":25381874837,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25381874837","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-05T00:37:05Z","databaseId":25351445710,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25351445710","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-05T00:14:10Z","databaseId":25350710886,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25350710886","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T23:46:20Z","databaseId":25349786685,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25349786685","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T23:41:23Z","databaseId":25349617427,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25349617427","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T21:59:15Z","databaseId":25345801420,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25345801420","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T18:58:07Z","databaseId":25337479391,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25337479391","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T18:41:26Z","databaseId":25336691973,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25336691973","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T14:02:47Z","databaseId":25323487007,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25323487007","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T13:46:08Z","databaseId":25322648305,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25322648305","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T13:41:05Z","databaseId":25322397494,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25322397494","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T13:25:08Z","databaseId":25321612836,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25321612836","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T12:59:15Z","databaseId":25320381976,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25320381976","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T12:52:11Z","databaseId":25320050348,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25320050348","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T12:11:13Z","databaseId":25318222324,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25318222324","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T11:54:45Z","databaseId":25317506363,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25317506363","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-04T11:25:36Z","databaseId":25316294037,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25316294037","workflowName":"Unity WebGL Build & Deploy"},{"conclusion":"failure","createdAt":"2026-05-03T22:28:56Z","databaseId":25292648162,"headBranch":"main","status":"completed","url":"https://github.com/pltnv123/officebot/actions/runs/25292648162","workflowName":"Unity WebGL Build & Deploy"}]
```

## GitHub Pages visibility

```text
{"message":"Not Found","documentation_url":"https://docs.github.com/rest/pages/pages#get-a-apiname-pages-site","status":"404"}
```

## Build/deploy assumptions found by references

- Files referencing Build/deploy artifact names: 23
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

## Findings

- Build artifacts are referenced by repo files and should not be removed without an approved release/deploy replacement.
- No workflow changes were made; CI/CD fixes should be proposal-only until an owner approves exact workflow edits.
- If latest runs show failures, diagnose with read-only run logs before editing any workflow.
