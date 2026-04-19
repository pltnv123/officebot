# Assisted Execution Dispatch Layer

## Stable milestone
A unified read-only assisted execution dispatch/control-plane suggestion layer is now available over runtime tasks, decision assistance, knowledge-aware context, and maintenance signals.

## What this layer includes
- dispatch recommendations
- recipient assignment candidates
- execution priority queue
- task-to-agent mapping suggestions
- dispatch lanes by role / task type / urgency
- dispatch payload

## Added
- `backend/assistedExecutionDispatchLayer.js`
- `scripts/export-assisted-execution-dispatch.js`
- `scripts/assisted-execution-dispatch-smoke.js`
- `docs/artifacts/assisted-execution-dispatch.json`
- `/api/export/assisted-execution-dispatch`

## Alignment checks in this package
- decision assistance
- knowledge-aware context
- runtime tasks (Supabase source of truth)
- maintenance/anomaly signals
- analytics/export/reporting
- role-aware client surface
- snapshot-safe reread
- websocket read-only enhancement

## Guarantees
- additive only
- control-plane suggestion layer only
- no real assignment execution
- no source-of-truth semantic changes
- no workflow/runtime regression
