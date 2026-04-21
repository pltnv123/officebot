# Iteration 63 - Executor Coordination Decision Policy

## Goal
Build an explainable coordinator-facing policy selection layer over coordination actions and state transitions.

## Scope
- Add `backend/executorCoordinationDecisionPolicyLayer.js`
- Add export script and smoke coverage
- Add `/api/export/executor-coordination-decision-policy`
- Keep runtime truth in Supabase-backed snapshot flow
- Keep policy selection staged, guarded, and read-only by default

## Output Surface
- `executor_coordination_decision_policy`
- `policy_decision_catalog`
- `policy_selection_inputs`
- `policy_guardrails`
- `policy_decision_summary`
- `policy_decision_payload`

## Design Notes
- Policy selection is explainable and coordinator-oriented, but not uncontrolled execution.
- Policy chooses a guarded action and transition pair for the current orchestration state.
- Higher layer consumes coordination actions and state transitions through a terminal-consumer pattern.

## Acceptance
1. `node ./scripts/export-executor-coordination-decision-policy.js`
2. `node ./scripts/executor-coordination-decision-policy-smoke.js`
3. nearest regressions after PASS
