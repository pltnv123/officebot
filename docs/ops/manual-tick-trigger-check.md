# Manual Tick Trigger Check

## Trigger Path
- scripts/manual_tick.sh reads `runtime/state/next-step.json`, enforces the role whitelist, and performs one bounded step.
- It updates `current-objective.json` with the step, marks it completed, appends to `completed.jsonl`, and clears `next-step.json`.

## One-Step Limit
- The script exits after writing `{}` to `next-step.json`, so no extra steps run.
- Blockers are never touched by this step; if blockers exist, future scripts can check and halt.

## Verification
- Run `bash scripts/manual_tick.sh` with the desired state files in place and inspect the resulting `completed.jsonl` entry and `next-step.json` reset.
- Document the manual run in `docs/ops/manual-tick-trigger-check.md` for auditing.
