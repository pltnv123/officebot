# Iteration 65 - Operator Intervention Control

## Goal
Build an operator-facing control surface over the coordination gate stack without introducing uncontrolled execution.

## Scope
- Add `backend/operatorInterventionControlLayer.js`
- Add export script and smoke coverage
- Add `/api/export/operator-intervention-control`
- Keep runtime truth in Supabase-backed snapshot flow
- Keep intervention actions bounded, staged, and read-only by default

## Output Surface
- `operator_intervention_control`
- `intervention_actions`
- `intervention_preconditions`
- `intervention_guardrails`
- `intervention_summary`
- `intervention_payload`

## Design Notes
- Intervention control is a terminal-consumer layer over execution gate, policy, actions, and state transitions.
- Operator actions remain staged / guarded and do not trigger uncontrolled execution.
- No websocket truth, no hidden mutations, no broad refactor.

## Acceptance
1. `node ./scripts/export-operator-intervention-control.js`
2. `node ./scripts/operator-intervention-control-smoke.js`
3. nearest regressions after PASS
