# BACKLOG.md — Project Backlog
Last updated: 2026-03-10

## PHASE 1 — Visual Scene Match [COMPLETE ✅]
All tasks done as of commit d200c44, WASM 2026-03-10 09:18:46 UTC

- VIZ-001 [DONE] 3 robots visible — commit 81b949b
- VIZ-002 [DONE] Pixar warm lighting — commit 85b1c19
- VIZ-003 [DONE] Robot rotations + face camera
- VIZ-004 [DONE] Pixar robot models — commits 02ed198, adc7532
- VIZ-005 [DONE] Robot name labels billboard
- Scene rebuild [DONE] Zones, board, dispatch, monitoring, room2, plants, paths — commit d200c44

## PHASE 2 — Functionality [CURRENT PHASE]

### FUNC-001 [DONE] — Live task cards on board
- Connect board cards to backend API
- Cards update without page reload
- Each card: task ID, title, assignee color dot
- No hardcoded data — real backend only

### FUNC-002 [DONE] — Robot animations enhanced
- Idle: existing bob + subtle rotation ✓ partial
- Working state: faster bob + eye glow pulse
- Moving state: smooth lerp to target position

### FUNC-003 [DONE] — Room 2 implementation
- Accessible via door top-right
- Contains: secondary workspace, 2 agents
- Orange glow frame matches reference image

### FUNC-004 [TODO] — NavMesh robot pathfinding
- Agents move to task zone when assigned work
- Smooth path following, no clipping
- Return to idle position when task complete

## PHASE 3 — Polish & Ops [LOCKED until Phase 2 done]
- OPS-001: Healthcheck improvements
- OPS-002: CI pipeline optimization
- OPS-003: Performance monitoring
