# officebot regression test strategy

## Existing test/build/check commands
Package script rows: 418. Script paths inventoried: 251. See `/output/officebot-test-command-inventory.csv`.

## Safe to run locally
- Read-only git/gh/qmd diagnostics.
- Markdown/report generation.
- Static inventory scripts.
- Package scripts only after command review confirms no runtime/build writes or service dependencies.

## Requires secrets/services or approval
- Deploy/release scripts.
- Supabase or external API commands.
- Unity license/build workflows.
- Scripts that write runtime state or Build artifacts.

## Minimal PR check suite
See `/output/officebot-acceptance-checklist.md`.

## Cleanup PR check suite
Exact-path approval, diff guard, no deletion, rollback plan, fresh checkout review.

## Build artifact migration check suite
Serve/load WebGL demo, Pages/release verification, rollback restore.

## Runtime state cleanup check suite
Fresh checkout boot, default/init generation, backend/control-plane smoke.

## CI/CD fix check suite
Workflow exact diff, approved secret/settings changes, latest run verification.

## Manual QA checklist
- Open demo in browser.
- Verify Unity/WebGL load.
- Verify agent/control-plane docs and scripts.
- Verify generated logs/state remain untracked.

## Future automation plan
PR32 should add a docs-first test harness proposal, then source/test scripts only after explicit approval.
