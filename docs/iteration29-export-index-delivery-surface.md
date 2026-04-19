# Export Index / Delivery Surface

## Stable milestone
A read-only export index and delivery surface is now available for navigation across all ready external-facing artifacts and endpoints.

## What this layer includes
- executive summary
- stakeholder handoff bundle
- decision context export
- external reporting layer
- operator clone report / rehearsal artifact
- existing read-only export endpoints

## Added
- `backend/exportIndexLayer.js`
- `scripts/export-export-index.js`
- `scripts/export-index-smoke.js`
- `scripts/export-index-ui-smoke.js`
- `docs/artifacts/export-index.json`
- `/api/export/export-index`
- compact UI delivery entry in the main UI surface

## Guarantees
- delivery/navigation only
- no source-of-truth semantic changes
- additive wiring only
- built on top of existing read-only export layers
