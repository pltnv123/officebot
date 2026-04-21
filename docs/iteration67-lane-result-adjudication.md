# Iteration 67 - Lane Result Adjudication

## Goal
Build a governed adjudication layer for lane outcomes without introducing uncontrolled execution.

## Scope
- Add `backend/laneResultAdjudicationLayer.js`
- Add export script and smoke coverage
- Add `/api/export/lane-result-adjudication`
- Keep runtime truth in Supabase-backed snapshot flow
- Keep adjudication explainable, bounded, and read-only by default

## Output Surface
- `lane_result_adjudication`
- `adjudication_inputs`
- `adjudication_outcome`
- `adjudication_guardrails`
- `adjudication_summary`
- `adjudication_payload`

## Design Notes
- Adjudication consumes evidence ledger and gate stack through a terminal-consumer pattern.
- It combines backend, ios, and qa lane outcomes into a governed explainable result.
- No websocket truth, no hidden mutations, no uncontrolled execution.

## Acceptance
1. `node ./scripts/export-lane-result-adjudication.js`
2. `node ./scripts/lane-result-adjudication-smoke.js`
3. nearest regressions after PASS
