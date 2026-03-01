# ORCH-2026-03-01 — Unity WebGL OpenClaw Visualization

## Objective
Собрать веб/мобайл визуализацию OpenClaw в одной 3D изометрической сцене с режимами Cozy/Thriller, data-driven от OpenClaw API.

## Target architecture
- Client: Unity 2022+ URP (Mobile), WebGL build
- Server: Ubuntu VPS + nginx + API proxy (Node/Python)
- CI/CD: GitHub Actions -> build WebGL -> deploy to VPS

## Work phases

### Phase 1 — Foundation
1. Unity project bootstrap (URP mobile preset)
2. Repo structure (`UnityProject/`, `Web/`, `office/Build/`, workflows)
3. Basic scene: 1 bot + 1 assistant + camera + baked light

### Phase 2 — Runtime systems
1. Data contracts for `/state` and mapping to runtime models
2. Network layer (polling first, WebSocket optional)
3. AgentController + task/event binding
4. UI overlay + SendMessage bridge JS<->Unity

### Phase 3 — Visual mode system
1. ModePreset (Cozy/Thriller)
2. Shared geometry, switched profiles only (light/LUT/post/audio)
3. Runtime mode switching and smooth transition

### Phase 4 — Optimization
1. Lightmaps and static batching
2. KTX2/Basis texture pipeline
3. Quality tiers (High/Mid/Low)
4. Memory/FPS budget enforcement

### Phase 5 — CI/CD and VPS
1. GitHub Actions build pipeline
2. Deploy script + nginx config
3. Cache/compression rules

### Phase 6 — QA and Release
1. Browser/mobile smoke tests
2. Perf profile pass (TTFF, FPS, memory)
3. Final checklist and release report

## Immediate next 7 steps (execution order)
1. Freeze canonical JSON schema for `/state`
2. Build Unity bootstrap checklist and required package list
3. Add minimal API proxy contract doc
4. Implement web wrapper (`Web/index.html`, `loader.js`) contract
5. Define first sprint DoD (done criteria)
6. Prepare CI workflow stub
7. Prepare VPS deploy checklist
