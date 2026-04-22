# Iteration 75 - Bounded Coordinator Progression Decisions Ledger

## Goal
Build a controlled decision-log ledger layer on top of the real bounded coordinator progression engine.

## Scope
- Add `backend/boundedCoordinatorProgressionDecisionsLedgerLayer.js`
- Add export script and smoke coverage
- Add `/api/export/bounded-coordinator-progression-decisions-ledger`
- Keep runtime truth in Supabase-backed snapshot flow
- Keep ledger bounded, explainable, and read-only by default

## Output Surface
- `bounded_coordinator_progression_decisions_ledger`
- `progression_decision_records`
- `progression_decision_log`
- `progression_decision_guardrails`
- `progression_decision_summary`
- `progression_decision_payload`

## Design Notes
- Ledger stays controlled and does not start uncontrolled execution.
- Export path prefers terminal-consumer composition and lightweight snapshots.
- Ledger records progression candidate evaluation, gate checks, operator confirmation, result, no-op, and guarded hold decisions.
- No websocket truth, no hidden mutations, no uncontrolled execution.

## Acceptance
1. `node ./scripts/export-bounded-coordinator-progression-decisions-ledger.js`
2. `node ./scripts/bounded-coordinator-progression-decisions-ledger-smoke.js`
3. nearest regressions after PASS
