# Iteration 76 - Operator Progression Review

## Goal
Build an operator-facing progression review surface on top of the bounded coordinator progression stack.

## Scope
- Add `backend/operatorProgressionReviewLayer.js`
- Add export script and smoke coverage
- Add `/api/export/operator-progression-review`
- Keep runtime truth in Supabase-backed snapshot flow
- Keep review bounded, explainable, controlled, and read-only by default

## Output Surface
- `operator_progression_review`
- `progression_review_inputs`
- `progression_review_actions`
- `progression_review_guardrails`
- `progression_review_summary`
- `progression_review_payload`

## Design Notes
- Review surface stays operator-facing and does not start uncontrolled execution.
- Export path prefers terminal-consumer composition over heavy peer fanout.
- Review covers progression candidate, hold reason, guardrail trigger, operator confirmation need, next guarded move readiness, no-op outcome, and manual override requirement.
- No websocket truth, no hidden mutations, no uncontrolled execution.

## Acceptance
1. `node ./scripts/export-operator-progression-review.js`
2. `node ./scripts/operator-progression-review-smoke.js`
3. nearest regressions after PASS
