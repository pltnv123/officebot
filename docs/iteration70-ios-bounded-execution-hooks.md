# Iteration 70 - iOS Bounded Execution Hooks

## Goal
Build the first bounded execution hook layer for the iOS lane over the bounded coordinator execution bridge.

## Scope
- Add `backend/iosBoundedExecutionHooksLayer.js`
- Add export script and smoke coverage
- Add `/api/export/ios-bounded-execution-hooks`
- Keep runtime truth in Supabase-backed snapshot flow
- Keep hooks bounded, explainable, and non-executable by default

## Output Surface
- `ios_bounded_execution_hooks`
- `bounded_ios_hook_catalog`
- `bounded_ios_hook_guardrails`
- `bounded_ios_hook_summary`
- `bounded_ios_hook_payload`

## Design Notes
- Hooks consume the bounded coordinator bridge and iOS runtime through a terminal-consumer pattern.
- This stays inside strict guardrails and does not enable uncontrolled execution.
- No websocket truth, no hidden mutations, no broad refactor.

## Acceptance
1. `node ./scripts/export-ios-bounded-execution-hooks.js`
2. `node ./scripts/ios-bounded-execution-hooks-smoke.js`
3. nearest regressions after PASS
