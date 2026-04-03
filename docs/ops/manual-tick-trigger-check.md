# Manual Tick Trigger Check

## Trigger Path
- scripts/manual_tick.sh reads `runtime/state/next-step.json` and ensures the assigned role is one of the five core roles.
- It creates a lock directory `/tmp/manual_tick.lock` so only one invocation runs at a time.
- Blocked ticks abort if `runtime/state/blockers.json` is non-empty, so no unsafe advancement happens.

## One-Step Limit
- After copying the step to `current-objective.json` and marking it complete, the script appends to `completed.jsonl` and then either takes the next entry from `runtime/state/backlog.json` or writes a planner-required state to `next-step.json`, ensuring exactly one bounded step per run.

## Verification
- Run `bash scripts/manual_tick.sh` and verify the resulting `current-objective.json`, `completed.jsonl`, and new `next-step.json` values match the manual run expectations.
- Document each manual tick run through this doc for later auditing.
