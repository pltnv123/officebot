# CTO / Orchestrator Decision Panel UI

## Stable milestone
A read-only CTO/Orchestrator decision surface is now wired into the main UI/export surface.

## What this layer shows
- decision_summary
- retrieval_aware_planning_hints
- routing_context_summary
- memory_aware_task_context
- cto_orchestrator_brief
- compact_decision_payload

## Added
- decision panel mount in `index.html`
- decision panel render path in `scripts/tasks-ui.js`
- decision panel styles in `style.css`
- knowledge context attached to `/api/state`
- `scripts/decision-panel-ui-smoke.js`

## Guarantees
- read-only only
- no workflow/runtime/source-of-truth semantic changes
- additive wiring on top of the existing operator/runtime/UI stack
