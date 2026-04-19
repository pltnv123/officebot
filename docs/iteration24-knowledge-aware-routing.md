# Knowledge-Aware Planning and Routing Layer

## Stable milestone
A compact additive knowledge-aware layer is now available for CTO and Orchestrator planning/routing surfaces.

## What this layer adds
- retrieval-aware planning hints
- context summary for routing
- memory-aware task context
- compact read-only knowledge context export

## Source-of-truth model
- Supabase = runtime source of truth
- QMD = retrieval and knowledge layer
- lossless-claw = memory and prior-context layer

## Added
- `backend/knowledgeAwareLayer.js`
- `scripts/export-knowledge-aware-context.js`
- `scripts/knowledge-aware-routing-smoke.js`
- `docs/artifacts/knowledge-aware-context.json`
- `/api/export/knowledge-aware-context`

## Guarantees
- additive only
- no destructive live mutation
- no workflow/runtime/operator/UI semantic changes
- read-only export surface for planning and routing only

## Routing payload sections
- routing summary
- planning hints
- context summary
- memory-aware tasks
- compact context payload
