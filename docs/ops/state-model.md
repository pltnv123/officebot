# State Model

## State Files
- `runtime/state/current-objective.json`: captures the currently executing objective, assigned role, and status.
- `runtime/state/backlog.json`: queue of planned objectives with metadata and priority.
- `runtime/state/completed.jsonl`: append-only log of finished objectives and evidence.
- `runtime/state/blockers.json`: tracked blockers that pause the flow.
- `runtime/state/next-step.json`: holds the next targeted action for handoff.

## Source of Truth Rules
- Files under `runtime/state/` are the canonical state for the Phase 1 roles. Any supervisor or automation must read here first before acting.
- These files live in our repo (not third_party), so we control updates and versioning.

## Update Discipline
- Agents update `current-objective.json` when they claim or finish work, append to `completed.jsonl`, and update `next-step.json` for the subsequent block.
- Backlog and blockers are written before execution begins so the supervisor can reroute work if necessary.

## Recovery After Timeout/Reset
- On restart, load these files to rebuild the last known objective, backlog entries, blockers, and next-step hints.
- If corruption is detected, restore from recent commits and rerun prior verification commands before resuming.
