# Unattended Tick Plan

## Tick Activities
- Reads the latest `runtime/state/next-step.json` to discover the bounded action.
- Checks `runtime/state/current-objective.json` for active work and `runtime/state/backlog.json` for pending tasks.
- Executes exactly one bounded step, updating `current-objective.json`, appending to `completed.jsonl`, and refreshing `next-step.json`.

## File Order
- Read order: `next-step.json` → `current-objective.json` → `backlog.json`.
- Last update: `next-step.json` gets refreshed once the bounded step concludes.

## Safety Rules
- Tick stops if `next-step.json` is missing, blocked, or lacks a bounded role assignment.
- Blockers are recorded in `runtime/state/blockers.json`; tick exits if an active blocker is present.
- Each tick handles one bounded step; it never chains multiple objectives, avoiding giant turns.
