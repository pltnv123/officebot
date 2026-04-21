# Iteration 71 - QA Bounded Verification Hooks

## Goal
Build a bounded verification hook layer for the QA lane over the bounded coordinator execution bridge.

## Scope
- Add `backend/qaBoundedVerificationHooksLayer.js`
- Add export script and smoke coverage
- Add `/api/export/qa-bounded-verification-hooks`
- Keep runtime truth in Supabase-backed snapshot flow
- Keep hooks bounded, explainable, non-executable, and verification-first by default

## Output Surface
- `qa_bounded_verification_hooks`
- `bounded_qa_hook_catalog`
- `bounded_qa_hook_guardrails`
- `bounded_qa_hook_summary`
- `bounded_qa_hook_payload`

## Design Notes
- Hooks consume the bounded coordinator bridge and QA runtime through a terminal-consumer pattern.
- This stays inside strict guardrails and preserves verification-first semantics.
- No websocket truth, no hidden mutations, no broad refactor.

## Acceptance
1. `node ./scripts/export-qa-bounded-verification-hooks.js`
2. `node ./scripts/qa-bounded-verification-hooks-smoke.js`
3. nearest regressions after PASS
