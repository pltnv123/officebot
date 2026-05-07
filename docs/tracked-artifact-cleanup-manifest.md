# Tracked artifact cleanup manifest

## Purpose

This document records the tracked runtime, log, state, and generated artifact candidates found after the repository hygiene policy was merged. It is intended to support a future cleanup PR that may untrack approved artifacts from the Git index only.

## Relation to PR #21

PR #21 added repository hygiene policy and `.gitignore` coverage for runtime/log/state/generated artifacts. `.gitignore` prevents new matching files from being added, but it does not remove files that are already tracked. This manifest is the next safe docs-only step after PR #21.

## Safety statement

This PR does not delete files, does not untrack files, does not run `git rm --cached`, does not modify runtime/log/state/generated files, and does not change workflows or CI. It only adds this documentation file.

## Candidate summary

- Total tracked artifact candidates: 29
- Safe untrack candidates: 1
- Needs manual review: 28
- Keep tracked: 0
- Unknown: 0

## Category summary

- `generated`: 4
- `generated_build`: 4
- `logs`: 7
- `runtime_dir`: 8
- `runtime_state`: 6

## Classification

### Safe untrack candidates

- `live_ops_daemon.log` — Runtime/log/state-like tracked artifact; covered by .gitignore; no references found by git grep.

### Needs manual review

- `.live_ops.jsonl` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 6.
- `.runtime_progress.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 3.
- `.tasks.backup.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 3.
- `.world.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 3.
- `Build/office.data` — Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 1.
- `Build/office.framework.js` — Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 3.
- `Build/office.loader.js` — Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 3.
- `Build/office.wasm` — Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 1.
- `artefacts/func004/browser_console.log` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 1.
- `artefacts/func004/sequence/console.log` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 20.
- `artefacts/func004/sequence_console.log` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 5.
- `backend/backend.log` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 2.
- `current_scene.png` — Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 1.
- `runtime/activation-bridge-loader.js` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 4.
- `runtime/activation-bridge.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 5.
- `runtime/agency-agents-registry.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 3.
- `runtime/state/backlog.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 15.
- `runtime/state/blockers.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 19.
- `runtime/state/completed.jsonl` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 20.
- `runtime/state/current-objective.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 22.
- `runtime/state/next-step.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 27.
- `scene_check.b64` — Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed.
- `screenshot_latest.png` — Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 2.
- `scripts/ops/self_improve.log` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 1.
- `state.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 20.
- `state_sync_daemon.log` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 1.
- `tasks.json` — Runtime/log/state-like file but references found; review before untracking. Reference hits: 20.
- `viz_fix.png` — Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 3.

### Keep tracked

- None from this artifact-pattern scan.

### Unknown

- None.

## Candidate table

| path | category | tracked_status | size_bytes | last_commit_short | risk_level | recommended_action | notes |
|---|---|---:|---:|---|---|---|---|
| .live_ops.jsonl | runtime_state | tracked | 75300 | b76437d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 6. |
| .runtime_progress.json | runtime_state | tracked | 17331 | b76437d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 3. |
| .tasks.backup.json | runtime_state | tracked | 8958 | b76437d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 3. |
| .world.json | runtime_state | tracked | 163 | cd7843b | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 3. |
| Build/office.data | generated_build | tracked | 6448798 | da2d574 | medium | needs_manual_review | Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 1. |
| Build/office.framework.js | generated_build | tracked | 427217 | da2d574 | medium | needs_manual_review | Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 3. |
| Build/office.loader.js | generated_build | tracked | 26982 | da2d574 | medium | needs_manual_review | Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 3. |
| Build/office.wasm | generated_build | tracked | 33507313 | da2d574 | medium | needs_manual_review | Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 1. |
| artefacts/func004/browser_console.log | logs | tracked | 596 | b76437d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 1. |
| artefacts/func004/sequence/console.log | logs | tracked | 13147 | b76437d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 20. |
| artefacts/func004/sequence_console.log | logs | tracked | 13147 | b76437d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 5. |
| backend/backend.log | logs | tracked | 1129 | cd7843b | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 2. |
| current_scene.png | generated | tracked | 68064 | b76437d | medium | needs_manual_review | Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 1. |
| live_ops_daemon.log | logs | tracked | 0 | cd7843b | low | untrack_candidate | Runtime/log/state-like tracked artifact; covered by .gitignore; no references found by git grep. |
| runtime/activation-bridge-loader.js | runtime_dir | tracked | 638 | 2815164 | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 4. |
| runtime/activation-bridge.json | runtime_dir | tracked | 355 | d2d279d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 5. |
| runtime/agency-agents-registry.json | runtime_dir | tracked | 3 | 9c4202a | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 3. |
| runtime/state/backlog.json | runtime_dir | tracked | 3 | 0adb1b7 | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 15. |
| runtime/state/blockers.json | runtime_dir | tracked | 3 | a3894d4 | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 19. |
| runtime/state/completed.jsonl | runtime_dir | tracked | 1775 | a66c7d0 | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 20. |
| runtime/state/current-objective.json | runtime_dir | tracked | 228 | 5406e30 | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 22. |
| runtime/state/next-step.json | runtime_dir | tracked | 242 | a66c7d0 | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 27. |
| scene_check.b64 | generated | tracked | 195568 | b76437d | medium | needs_manual_review | Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. |
| screenshot_latest.png | generated | tracked | 120428 | a59f139 | medium | needs_manual_review | Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 2. |
| scripts/ops/self_improve.log | logs | tracked | 127 | ce4e246 | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 1. |
| state.json | runtime_state | tracked | 27831 | b76437d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 20. |
| state_sync_daemon.log | logs | tracked | 3932986 | b76437d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 1. |
| tasks.json | runtime_state | tracked | 8790 | b76437d | medium | needs_manual_review | Runtime/log/state-like file but references found; review before untracking. Reference hits: 20. |
| viz_fix.png | generated | tracked | 144166 | b76437d | medium | needs_manual_review | Generated-looking artifact may be fixture/demo/release evidence or referenced; manual approval needed. Reference hits: 3. |

## Risks

- A runtime/state/log candidate may still be required by scripts, demos, tests, deployment, or operator procedures.
- Generated binaries, screenshots, and Base64 artifacts may be intentional fixtures, demo evidence, or release artifacts.
- Reference hits in source/docs/scripts mean many candidates need manual review before any index cleanup.
- Removing tracked artifacts from the Git index can surprise downstream users if they expect files to exist after checkout.
- Branch or workflow metadata may be stale; future cleanup must re-verify `main` before acting.

## Approval gates

1. Maintainer approves the exact paths to untrack.
2. Maintainer confirms whether manual-review candidates are disposable or intentional.
3. Maintainer approves a cleanup branch and PR scope.
4. Cleanup PR diff guard confirms only approved paths are affected.
5. Checks pass before merge approval.

## Future cleanup command template — NOT EXECUTED

```bash
git rm --cached <approved-paths>
```

This command must only be run in a future cleanup branch after exact path approval. It should remove approved files from the Git index while leaving local working copies intact.

## Rollback strategy

```bash
git revert <cleanup-commit>
```

Reverting the cleanup commit restores the previous tracked index state if an approved artifact was untracked incorrectly.

## Acceptance criteria for a future cleanup PR

- Based on the current default branch `main`.
- Uses only explicitly approved paths.
- Does not delete local working files.
- Does not change workflows, CI, source code, or `.gitignore` unless separately approved.
- Contains no runtime/log/state/generated file content edits.
- Shows a diff limited to approved index removals and any separately approved docs updates.
- Runs relevant checks and reports results before merge.
