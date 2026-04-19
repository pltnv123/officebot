# External Reporting Layer Package

## Stable milestone
A compact external-facing reporting layer is now available as a read-only export surface on top of existing analytics/export data.

## Added
- `scripts/export-external-reporting-layer.js`
- `scripts/external-reporting-layer-smoke.js`
- `docs/artifacts/external-reporting-layer.json`

## Reporting sections
- runtime summary
- operator summary
- approvals / retries / escalations
- maintenance summary
- clone / rehearsal summary

## Guarantees
- read-only only
- no backend contract changes
- no workflow/source-of-truth semantic changes
- built on top of existing analytics/export/clone-report data

## Export shape
The reporting artifact includes:
- human-readable grouped sections
- export-friendly compact JSON shape
- scenario outcomes for all five operator clone flows
