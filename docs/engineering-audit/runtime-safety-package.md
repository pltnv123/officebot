# officebot runtime safety package

## Current runtime dependencies
- Runtime/state-like tracked files: 11
- Reference files: 49

## Operationally significant examples
- `.world.json`
- `runtime/activation-bridge-loader.js`
- `runtime/activation-bridge.json`
- `runtime/agency-agents-registry.json`
- `runtime/state/backlog.json`
- `runtime/state/blockers.json`
- `runtime/state/completed.jsonl`
- `runtime/state/current-objective.json`
- `runtime/state/next-step.json`
- `state.json`
- `tasks.json`

## Why cleanup is dangerous without init/default design
Fresh checkout behavior may depend on state files. Untracking without defaults can break backend/control-plane scripts, agents, or demos.

## Approval-gated sequence
Docs-only checklist → init/default script proposal → test harness → limited untrack → validation.
