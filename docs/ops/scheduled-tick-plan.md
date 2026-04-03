# Scheduled Tick Plan

## Tick Scope
- Each scheduled tick reads `runtime/state/next-step.json` and `runtime/state/blockers.json`, ensuring only one bounded step (core role) runs per invocation.
- Ticks are triggered via the existing cron/scheduler hook `scripts/manual_tick.sh` once per hour (or via an external scheduler) until a blocking condition occurs.

## Rules
- One-step-per-trigger: After executing the current step, the tick updates `runtime/state/current-objective.json`, creates a completed entry, and refreshes `next-step.json` with either backlog-driven work or a planner-required placeholder.
- Blocker stop rule: If `runtime/state/blockers.json` contains entries, scheduled ticks exit cleanly without mutating other files.
- Non-reentry rule: Execution uses a simple lock mechanism (`/tmp/manual_tick.lock`) to prevent overlapping ticks.
- State of truth: All decisions rely solely on runtime/state/ files; no memory from chat is used.
- Rollback/disable: To disable scheduling, remove the cron hook or blank the scheduler invocation and restore docs from last known good commit.
