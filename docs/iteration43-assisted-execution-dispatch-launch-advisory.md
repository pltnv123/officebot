# Assisted Execution Dispatch Launch Advisory

## Stable milestone
A unified read-only dispatch launch advisory layer is now available over the assisted execution dispatch orchestration preflight layer.

## What this layer includes
- launch advisories
- start-window signals
- orchestration hold reasons
- dispatch activation posture
- advisory summary
- advisory payload

## Added
- `backend/assistedExecutionDispatchLaunchAdvisoryLayer.js`
- `scripts/export-assisted-execution-dispatch-launch-advisory.js`
- `scripts/assisted-execution-dispatch-launch-advisory-smoke.js`
- `docs/artifacts/assisted-execution-dispatch-launch-advisory.json`
- `/api/export/assisted-execution-dispatch-launch-advisory`

## Alignment checks in this package
- assisted execution dispatch orchestration preflight
- assisted execution dispatch coordination pack
- dispatch readiness gate
- decision assistance
- knowledge-aware context
- runtime from Supabase as source of truth
- analytics/export/reporting
- role-aware client surface
- snapshot-safe reread
- websocket read-only enhancement

## Guarantees
- additive only
- explainable read-only advisory layer only
- no execution semantic changes
- no workflow/runtime regression
