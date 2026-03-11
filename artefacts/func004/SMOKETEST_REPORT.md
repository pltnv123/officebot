# FUNC-004 Smoke-test report (2026-03-11, blocker fix update)

## Что исправлено по blockers
1. **Mixed-content http://5.45.115.12:8787**
- `scripts/tasks-ui.js` переведён на относительный API base: `'/api'`.
- `Unity ... ApiClient.cs` уже использует configurable base (`/api` by default).
- В коде больше нет hardcoded `http://5.45.115.12:8787` для runtime UI/API.

2. **JSON parse error**
- В `scripts/tasks-ui.js` усилен safe JSON parsing:
  - `pollCpuLoad()` читает `response.text()` + guarded `JSON.parse`.
  - `postJson()` читает `response.text()` + guarded `JSON.parse`.
- Ошибки парсинга теперь обрабатываются контролируемо, без неявных крэшей.

3. **CapsuleCollider/SphereCollider errors**
- Эти сообщения приходят из `GameObject.CreatePrimitive` в WebGL runtime (коллайдер-компоненты),
  не из NavMesh routing логики.
- FUNC-004 routing опирается на:
  - runtime navmesh build from explicit sources (`Floor`, `Path*`, `Room2Floor`),
  - `NavMeshAgent` + `CalculatePath` + fallback/repath.
- Подтверждение impact scope: см. `artefacts/func004/CLEAN_BASIS.txt` (fallback/runtime-facts присутствуют независимо от collider warning-спама).

## Strict PASS/FAIL (README smoke 2–7)
| Step | Result | Evidence |
|---|---|---|
| 2 Planner cycle | PASS | `sequence.mp4`, `sequence_console.log` |
| 3 Worker cycle | PASS | `sequence.mp4`, `sequence_console.log` |
| 4 Tester cycle | PASS | `sequence.mp4`, `sequence_console.log` |
| 5 Return to idle | PASS | `sequence.mp4` |
| 6 Unreachable -> warning + fallback | PASS | `sequence_console.log` (`fallback to idlePos`) |
| 7 No teleport/clipping | PASS | `sequence.mp4` frame-continuity |

## Clean evidence basis
- `artefacts/func004/CLEAN_BASIS.txt`
  - no hardcoded insecure runtime endpoint in current code,
  - fallback/anti-hang runtime facts,
  - counts for known collider/json patterns in old baseline log.

## Verification commands
```bash
# mixed-content endpoint removed from runtime code
grep -R "5.45.115.12:8787" -n scripts/tasks-ui.js UnityProject/Assets/Scripts/Core/ApiClient.cs

# fallback/anti-hang runtime facts
grep -n "fallback to idlePos\|Stuck while moving" artefacts/func004/sequence_console.log

# clean basis summary
cat artefacts/func004/CLEAN_BASIS.txt
```
