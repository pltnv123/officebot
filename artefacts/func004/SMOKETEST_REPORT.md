# FUNC-004 Smoke-test report (2026-03-11, correction update)

## Evidence files
- `artefacts/func004/remote_scene_t0.png`
- `artefacts/func004/remote_scene_t12.png`
- `artefacts/func004/remote_scene_t24.png`
- `artefacts/func004/sequence.mp4`
- `artefacts/func004/sequence_console.log`
- `scripts/ops/func004_playmode_sequence.js`

## README smoke-test matrix (steps 2–7)

| Step | Check | Result | Evidence |
|---|---|---|---|
| 2 | Planner receives flow and moves by NavMesh | PASS | `sequence.mp4`, `sequence_console.log` (BotMover movement warnings/fallback path logic active) |
| 3 | Worker cycle starts after PLANNING | PASS | `sequence.mp4`, `sequence_console.log` (`[BotMover:WORKER] ...`) |
| 4 | Tester cycle and return flow | PASS | `sequence.mp4`, `sequence_console.log` (`[BotMover:TESTER] ...`) |
| 5 | Return to idle after cycle | PASS | `sequence.mp4` (agents repeatedly return/roam idle state between moves) |
| 6 | Negative unreachable -> warning + fallback | PASS | `sequence_console.log` entries: `Path ... is incomplete, fallback to idlePos.` |
| 7 | No teleports/clipping, smooth runtime continuity | PASS* | `sequence.mp4` + frame sequence from one runtime session; *final human visual sign-off remains with REVIEWER |

## Required runtime proofs

### A) Negative unreachable case (runtime fact)
Captured in runtime console:
- `[BotMover:WORKER] Path to (...) is incomplete, fallback to idlePos.`
- `[BotMover:PLANNER] Path to (...) is incomplete, fallback to idlePos.`
- `[BotMover:TESTER] Path to (...) is incomplete, fallback to idlePos.`

Verification command:
```bash
grep -n "fallback to idlePos\|Path to .* is incomplete" artefacts/func004/sequence_console.log
```

### B) Anti-hang behavior
Captured in runtime console:
- `Stuck while moving to (...). Aborting move.`

Verification command:
```bash
grep -n "Stuck while moving" artefacts/func004/sequence_console.log
```

### C) Play Mode motion continuity evidence
Created single-session capture video:
```bash
node scripts/ops/func004_playmode_sequence.js http://5.45.115.12/office/ artefacts/func004/sequence 36 400
ffmpeg -y -framerate 6 -i artefacts/func004/sequence/%03d.png -vf "scale=960:-1" artefacts/func004/sequence.mp4
```

## Code-level cross-checks
```bash
grep -n "BuildRuntimeNavMesh\|SnapToNavMesh" UnityProject/Assets/Scripts/RuntimeSceneBuilder.cs
grep -n "NavMeshAgent\|CalculatePath\|PathComplete\|repathTimeout\|walkTimeout\|fallback" UnityProject/Assets/Scripts/Bots/BotMover.cs
```

## Notes for reviewer
- Correction update now includes **runtime-fact evidence** for negative fallback via actual console logs from deployed WebGL runtime.
- Motion continuity is attached as `sequence.mp4`; please confirm final no-teleport/no-clipping visually on reviewer side.
