# ORCH-2026-03-01 — OpenClaw Office Premium Plan

## Goal
Сделать production-уровень веб-визуализации одной сцены (Cozy/Thriller) без дублирования геометрии, с OpenClaw API как source-of-truth.

## Phase 1 — Planning (Planner)
1. API contract freeze (`GET /state`, optional `GET /tasks`,`GET /agents`,`GET /events`)
2. Data model freeze (agents/tasks/stability/events)
3. LookProfile schema freeze (palette/LUT/light/post/vfx/audio)
4. Pixel contract freeze (`R_ref`, `X`, nearest, TAA off)
5. Asset inventory and LOD table freeze

## Phase 2 — Execution per task (Worker + Test-Runner + Debugger + Reviewer)
For each task:
- Worker implements
- Test-Runner validates (tests/lint/typecheck/runtime smoke)
- If fail -> Debugger (max 3 attempts)
- Reviewer gate

## Phase 3 — Finalization (Documenter)
- Consolidated report
- Remaining risks
- Release-readiness checklist

## Parallel tracks
- Art/TechArt: blockout -> UV2 -> bake -> materials
- Runtime: ModeController/Network/UI/AgentController
- Perf: WebGL/mob profiles + memory budget
- DevOps: CI/CD + nginx + compression + cache

## Acceptance gates
- Single scene parity preserved
- Cozy/Thriller switch data-driven
- Active/Done UI reflects source data
- Pixel stability passes
- QA scene pack complete

## Sprint breakdown (6–8 weeks)
- Sprint 1: Contracts + architecture + baseline scene parity
- Sprint 2: ModePreset + runtime switching + UI binding
- Sprint 3: pixel-perfect + material/light tuning
- Sprint 4: QA scenes + perf profiles
- Sprint 5: CI/CD + deploy hardening
- Sprint 6: polish + release candidate

## Immediate execution order (started)
1) Live/workspace parity fix and freeze
2) Task board orchestration states
3) ModeProfile wiring refactor
4) Pixel contract instrumentation
5) QA harness scenes and captures metadata
