# Decision-Assisted Workflows

## Stable milestone
A safe additive decision-assisted layer is now available on top of the existing knowledge-aware, decision-context, and operator/runtime/workflow stack.

## What this layer adds
- routing recommendations
- operator decision hints
- CTO/Orchestrator planning output
- compact decision-assistance surface

## Added
- `backend/decisionAssistanceLayer.js`
- `scripts/export-decision-assistance.js`
- `scripts/decision-assistance-smoke.js`
- `docs/artifacts/decision-assistance.json`
- `/api/export/decision-assistance`

## Alignment checks in this package
- analytics
- export/reporting
- role-aware client surface
- snapshot-safe reread
- websocket read-only enhancement

## Guarantees
- additive only
- no source-of-truth semantic changes
- no destructive live mutation
- no workflow/runtime regression
