# FUNC-004 Smoke-test report (2026-03-11)

## Scope
- Проверка наличия рабочей NavMesh-логики (код + runtime hooks)
- Визуальные артефакты (скриншоты сцены)
- Негативный кейс: unreachable -> warning + fallback (подтверждение по коду/лог-точкам)

## Команды и результаты

### 1) Проверка runtime hooks
```bash
grep -n "BuildRuntimeNavMesh\|SnapToNavMesh" UnityProject/Assets/Scripts/RuntimeSceneBuilder.cs
```
Ожидаемо: есть runtime bake + snap anchor-целей.

### 2) Проверка NavMesh движения и fallback
```bash
grep -n "NavMeshAgent\|CalculatePath\|PathComplete\|fallback\|repathTimeout\|walkTimeout" UnityProject/Assets/Scripts/Bots/BotMover.cs
```
Ожидаемо: агент, path validation, warning/fallback, анти-зависание.

### 3) Серия скриншотов сцены (deployed)
```bash
node scripts/screenshot.js http://5.45.115.12/office/ artefacts/func004/remote_scene_t0.png
node scripts/screenshot.js http://5.45.115.12/office/ artefacts/func004/remote_scene_t12.png
node scripts/screenshot.js http://5.45.115.12/office/ artefacts/func004/remote_scene_t24.png
sha256sum artefacts/func004/remote_scene_t0.png artefacts/func004/remote_scene_t12.png artefacts/func004/remote_scene_t24.png
```
Результат: получены 3 скрина с разными хешами (есть изменение кадра во времени).

## Negative unreachable case
- В коде реализованы warning + fallback:
  - `Target ... unreachable on NavMesh, fallback to idlePos.`
  - `Path ... incomplete, fallback to idlePos.`
- Для финального APPPROVED в ревью требуется runtime-лог с фактическим триггером этого кейса в Play Mode (через сцену/тестовый инжект недостижимой точки).

## Teleport/clipping
- По текущим артефактам подтверждено изменение кадров во времени.
- Полное доказательство «без телепортов/клиппинга» требует видео/кадровой последовательности из Play Mode в контролируемом тесте; это оставлено в списке проверок BUILDER/REVIEWER.
