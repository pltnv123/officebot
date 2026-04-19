# Isolated Live Workflow Harness

## Scope
Run operator workflows against in-memory clones of real runtime payloads, without mutating live state.

## Added
- `scripts/live-workflow-harness.js`
- `docs/operator-decision-checklist.md`
- reads current `/api/state`
- selects 1-2 real task payload snapshots
- runs isolated rehearsal branches:
  - approval
  - reject
  - requeue
  - escalate
  - resolve lock conflict
- validates branch alignment against:
  - analytics
  - export
  - role-aware client surface
  - snapshot-safe reread
  - websocket read-only enhancement
- outputs compact acceptance summary plus decision checklist

## Guarantees
- no destructive live mutations
- no storage/schema changes
- no broad refactor
- stable acceptance point remains untouched
