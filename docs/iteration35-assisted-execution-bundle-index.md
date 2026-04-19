# Assisted Execution Bundle Index / Publishing Surface

## Stable milestone
A unified read-only index/publishing surface is now available over the closed assisted execution handoff, assisted execution presentation, and assisted execution delivery bundle milestones.

## What this layer provides
- unified assisted execution surface index
- publishing map for CTO/Orchestrator routing
- recommended entry surface
- read-only endpoint and machine-readable artifact
- compact publishing payload for delivery/navigation

## Added
- `backend/assistedExecutionBundleIndexLayer.js`
- `scripts/export-assisted-execution-bundle-index.js`
- `scripts/assisted-execution-bundle-index-smoke.js`
- `scripts/assisted-execution-bundle-index-ui-smoke.js`
- `docs/artifacts/assisted-execution-bundle-index.json`
- `/api/export/assisted-execution-bundle-index`
- compact UI publishing entry in the main presentation surface

## Alignment checks in this package
- decision assistance
- analytics/export/reporting
- role-aware client surface
- snapshot-safe reread
- websocket read-only enhancement

## Guarantees
- additive only
- index/publishing layer only
- no source-of-truth semantic changes
- no workflow/runtime regression
