# Repository hygiene for runtime, logs, state, and generated artifacts

This document defines the first cleanup policy for `pltnv123/officebot`. The goal of the first PR is intentionally narrow: improve ignore rules and document safe cleanup practice without deleting or untracking anything.

## Files that should not be added to the repository

Do not add local/runtime artifacts unless there is an explicit reason and review approval. Typical examples:

- runtime state: `state.json`, `tasks.json`, `.tasks.backup.json`, `.runtime_progress.json`, `.world.json`, `.live_ops.jsonl`, `runtime/`;
- logs: `logs/`, `*.log`, `watchdog.log`, daemon logs;
- generated build/check output: `Build/`, `build/`, `dist/`, `*.b64`, ad-hoc screenshots such as `screenshot_latest.png`;
- Unity local/generated folders: `UnityProject/Library/`, `UnityProject/Temp/`, `UnityProject/Obj/`, `UnityProject/Build/`, `UnityProject/Builds/`, `UnityProject/Logs/`, `UnityProject/UserSettings/`;
- dependency folders such as `node_modules/`.

Keep source files, hand-written documentation, scripts, workflow definitions, and intentional fixtures tracked. If a generated artifact is needed as a fixture or release asset, document why it is intentional before committing it.

## Why tracked runtime files are not removed in this PR

Adding `.gitignore` rules does not remove files that are already tracked by Git. Removing or untracking tracked runtime/log/state/generated files can break workflows, demos, or operator state if those files are currently depended on.

For that reason, this first cleanup PR must not delete files and must not run automatic untrack commands. It only adds policy and documentation. Any tracked-file cleanup should happen later with a reviewed manifest.

## Safe untrack workflow for a later PR

Use a separate PR only after explicit approval of the exact file list. Recommended process:

1. Build a manifest of candidate tracked artifacts with paths, sizes, and why each should be untracked.
2. Confirm each candidate is not required by runtime, demos, tests, deployment, or documentation.
3. Get approval for the manifest.
4. In a cleanup branch, run `git rm --cached <path>` only for approved paths. Do not delete local working copies unless separately approved.
5. Run relevant checks and inspect the diff before opening the PR.
6. Keep rollback simple: revert the cleanup commit if any required artifact was untracked incorrectly.

## Working with `main` and `master`

`main` is the current default branch observed during read-only inspection. A separate `master` branch also exists. Treat this as a coordination risk:

- base new PRs on the repository default branch unless the maintainer explicitly chooses otherwise;
- do not merge `main` and `master`, rename branches, or delete branches as part of a cleanup PR;
- if branch consolidation is needed, plan it as a separate repository-governance task.

## Investigating failing GitHub Actions separately

This cleanup PR must not change workflow files. Failing Actions should be investigated in a separate read-only audit first:

1. List workflows and recent runs per workflow.
2. Identify the latest failed run, branch, job, and failing step.
3. Check whether failure happens before build, during build, deploy, or post-deploy validation.
4. Verify the workflow file exists on the default branch to avoid acting on stale branch metadata.
5. Prepare a focused CI-fix proposal or PR only after the failing step and intended behavior are clear.

Keeping Actions fixes separate makes the cleanup PR reviewable and avoids mixing hygiene policy with CI behavior changes.
