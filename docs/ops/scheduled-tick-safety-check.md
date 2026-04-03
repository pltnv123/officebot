# Scheduled Tick Safety Check

- **State readable**: confirm `runtime/state/next-step.json` and `runtime/state/blockers.json` before each tick.
- **One-step rule**: the tick executes a single bounded step per run, copying `next-step.json` to `current-objective.json` and marking completion.
- **Blocker handling**: if `blockers.json` is non-empty, the tick exits without mutating other files.
- **Non-reentry**: the lock at `/tmp/manual_tick.lock` prevents overlapping scheduler invocations.
- **State verification**: after running, ensure `completed.jsonl` has a new entry and `next-step.json` now either carries staged backlog work or a planner-required state.
- **Rollback/disable**: remove or disable the cron job or the scheduler trigger that invokes `scripts/manual_tick.sh` and revert the docs from git if needed.
