# Operator Workflow Readiness Package

## Stable acceptance point
A new stable acceptance point is confirmed for the end-to-end operator workflow layer.

Confirmed baseline:
- runtime event / maintenance signal reaches operator surface
- operator-facing hint/card/action is built from runtime state
- operator action execution updates task state safely
- analytics and export surfaces update consistently after operator actions
- role-aware client surface remains aligned with operator policy
- snapshot-safe reread remains the source-of-truth safety path
- websocket hydrate remains read-only enhancement, not a replacement for polling
- `requeue_task` now transitions client/UI live state from `retry` to `queued` via local assignment-state reset

## Compact stable summary
Accepted operator workflow layer now covers:
- analytics visibility for approvals, retries, conflicts, stale signals, and maintenance digest
- export visibility for operator snapshot plus analytics summary
- role-aware operator action visibility/executability
- client-surface textual and action-oriented rendering
- safe reread semantics with reconnect/backfill-safe payloads
- websocket hydration as additive read-only enhancement

## Readiness playbook updates
Use this package as the current readiness reference for real operator workflow checks.

### Approval / requeue / conflict loop
1. Inspect operator card, audit digest, and recommendations.
2. Confirm the action is executable for the current actor role.
3. Execute the operator action.
4. Wait for snapshot-safe reread or websocket hydrate update.
5. Verify downstream alignment in four places:
   - operator card state
   - analytics summary
   - export snapshot shape
   - client live state

### Requeue-specific expectation
After `requeue_task`:
- `status` remains `pending`
- `assignment_state` is locally normalized from `retry` to `queued`
- client/UI `live_state` must become `queued`
- retry-specific maintenance followup should no longer remain in top pending items for that task

### Role-aware review expectation
Current readiness baseline requires:
- `/api/state` remains role-aware
- `/api/operator/action` enforces capability routing
- client surface propagates actor role through request headers and UI mode/badge semantics

### Safety expectation
- snapshot polling remains mandatory source of truth
- websocket hydrate stays additive and read-only
- no readiness check should require storage/schema mutation

## Acceptance-oriented coverage in this package
- `scripts/operator-workflow-e2e-smoke.js`
- `scripts/operator-analytics-smoke.js`
- `scripts/export-surface-smoke.js`
- `scripts/ws-hydrate-smoke.js`
- `scripts/actor-role-propagation-smoke.js`
- `scripts/acceptance-live-loop.js`
- `scripts/operator-isolated-runtime-clone-smoke.js`
- `scripts/export-operator-clone-report.js`

## Follow-up stable milestone
The isolated runtime clone workflow layer now has a dedicated stable milestone with machine-readable reporting in `docs/iteration22-operator-clone-report.md`.
