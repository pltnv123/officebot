# MEMORY.md — Project State & Lessons
Last updated: 2026-03-10

## Project
- URL: http://5.45.115.12/office/
- GitHub: https://github.com/pltnv123/officebot
- Scene: UnityProject/Assets/Scripts/RuntimeSceneBuilder.cs
- Last WASM: 2026-03-10 11:12:31 UTC | Last commit: 2cde123

## Current Phase: PHASE 2 — Functionality
- FUNC-001 ✅ Live task cards — commit 7757939
- FUNC-002 ✅ Robot animations (idle/working states) — commit 2cde123
- FUNC-003 TODO Room 2 implementation
- FUNC-004 TODO NavMesh pathfinding

## Completed (Phase 1)
VIZ-001 ✅ 81b949b | VIZ-002 ✅ 85b1c19 | VIZ-003 ✅ | VIZ-004 ✅ adc7532 | VIZ-005 ✅
Scene rebuild ✅ d200c44 — zones, board, dispatch, monitoring, room2, plants, paths

## Skills Ready (9/51)
coding-agent, github, gh-issues, healthcheck, session-logs, skill-creator, tmux, video-frames, weather

## Lessons Learned
LEARNED 2026-03-08: Robots need negative Z to be visible from camera
LEARNED 2026-03-08: Shader.Find("Standard") returns null in URP WebGL
LEARNED 2026-03-08: Screenshot must be SENT to Telegram, not just saved
LEARNED 2026-03-09: Always wait for deploy step in CI, not just build-unity
LEARNED 2026-03-09: openclaw doctor fixes gateway after updates
LEARNED 2026-03-10: Scene uses BuildRoom/BuildZones/BuildAgents — do not revert
LEARNED 2026-03-10: Smart file reading saves ~60% tokens per wake-up
LEARNED 2026-03-10: MEMORY_TECH.md has technical details — read only when needed

## Technical details → see MEMORY_TECH.md
