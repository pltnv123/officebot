# Operator Clone Report Package

## Stable milestone
A stable milestone is confirmed for isolated runtime clone workflows.

This milestone covers safe in-memory operator scenarios without live mutation:
- approval
- reject
- requeue
- escalate
- lock conflict resolution

## Added
- `scripts/operator-isolated-runtime-clone-smoke.js`
- `scripts/export-operator-clone-report.js`
- `docs/artifacts/operator-clone-acceptance-report.json`

## What is confirmed
- operator cards, hints, and actions render correctly on isolated runtime clones
- action execution is validated for all 5 operator scenarios
- analytics and export visibility remain aligned with clone outcomes
- role-aware visibility/executability remains intact
- snapshot-safe reread behavior remains intact
- websocket remains a read-only enhancement

## Current scenario semantics
- approval -> approval clears, client live state remains `retry`
- reject -> approval clears, client live state remains `retry`
- requeue -> `assignment_state=queued`, client live state becomes `queued`
- escalate -> clone flow lands in `failed` live state with urgent maintenance/manual-review semantics visible
- lock conflict resolution -> conflict clears, client live state remains `retry`

## Artifact purpose
`docs/artifacts/operator-clone-acceptance-report.json` is the machine-readable report for downstream review, handoff, or future acceptance diffs.
