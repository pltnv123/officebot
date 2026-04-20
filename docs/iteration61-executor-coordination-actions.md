# Iteration 61 - Executor Coordination Actions

## Goal
Build a controlled coordinator-facing action surface over the executor orchestration loop.

## Scope
- Add `backend/executorCoordinationActionsLayer.js`
- Add export script and smoke coverage
- Add `/api/export/executor-coordination-actions`
- Keep runtime truth in Supabase-backed snapshot flow
- Keep actions staged, guarded, and read-only by default

## Output Surface
- `executor_coordination_actions`
- `lane_action_catalog`
- `action_preconditions`
- `action_guardrails`
- `coordination_actions_summary`
- `coordination_actions_payload`

## Design Notes
- Action surface is coordinator-oriented, but not uncontrolled execution.
- Actions are staged / no-op / guarded by default.
- Runtime consumes orchestration and lane runtimes through a terminal-consumer pattern.

## Acceptance
1. `node ./scripts/export-executor-coordination-actions.js`
2. `node ./scripts/executor-coordination-actions-smoke.js`
3. nearest regressions after PASS
