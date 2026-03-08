# Project Backlog

## PHASE 1 — Visual Scene Match (CURRENT PHASE, nothing else allowed)

### VIZ-001 [DONE] — 3 robots visible simultaneously
- Completed: 2026-03-08
- Commit: 81b949b
- Verified: screenshot + CI green + wasm updated

### VIZ-002 [DONE] — Bright warm Pixar lighting
- Completed: 2026-03-08
- Commit: 85b1c19
- ambient Color(1.0, 0.95, 0.85) + directional + dual rim lights
- Verified: CI green + wasm 2026-03-08 07:12:17 UTC

### VIZ-003 [DONE] — Robot face camera + Pixar robot models
- Fix robot rotations: worker Y=35, planner Y=0, reviewer Y=-40
- Verify: robots face toward camera in screenshot

### VIZ-004 [DONE] — Pixar robot models
- Completed: 2026-03-08
- Commits: 02ed198, adc7532
- Big round head (0.65x0.60x0.58), glowing eyes radius=0.13
- Light gray body Color(0.85, 0.85, 0.88)
- Verify: screenshot + CI green + wasm updated

### VIZ-005 [ACTIVE] — Robot name labels
- TextMesh WORKER/PLANNER/REVIEWER above each robot
- Billboard toward camera
- Verify: names readable in screenshot

## PHASE 2 — Functionality (only after ALL Phase 1 done)
- FUNC-001: Task cards on board update from backend live
- FUNC-002: Robot idle animation (gentle bobbing)
- FUNC-003: Room 2 implementation
- FUNC-004: NavMesh robot pathfinding

## PHASE 3 — Polish & Ops (only after Phase 2 done)
- OPS-001: Healthcheck improvements
- OPS-002: CI pipeline optimization
- OPS-003: Performance monitoring
