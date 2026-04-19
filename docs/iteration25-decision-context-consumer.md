# Knowledge-Aware Decision Consumer Layer

## Stable milestone
The knowledge-aware context is now connected as an additive consumer layer for CTO and Orchestrator decision output.

## What this layer adds
- retrieval-aware planning hints in decision output
- routing context summary for decision-making
- memory-aware task context in CTO/Orchestrator-facing summaries
- compact decision payload for read-only consumers

## Added
- decision consumer surface in `backend/knowledgeAwareLayer.js`
- `scripts/export-decision-context.js`
- `scripts/decision-context-smoke.js`
- `docs/artifacts/decision-context.json`
- `/api/export/decision-context`

## Guarantees
- additive only
- no runtime/operator/workflow semantic changes
- no destructive live mutation
- consumes existing knowledge-aware context without changing source of truth
