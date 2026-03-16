# OfficeHub GAP audit vs ТЗ (2026-03-03)

## Что есть сейчас
- Web UI (`office/index.html`, `scripts/tasks-ui.js`) работает и читает `state.json`.
- Есть Unity WebGL билд в `office/Build/*`.
- Есть скрипты прогресса/состояния (`update_state.sh`).
- Добавлен backend skeleton: `office/backend/server.js` с `/api/tasks`, `/api/state`, `/api/toggles/:id`, `/telegram/webhook`.

## Критичные расхождения с ТЗ
1. **Backend не был source-of-truth**
   - До фикса прогресс симулировался по времени (не факт-данные).
2. **Unity структура не соответствует ТЗ**
   - Нет `OfficeHub.unity`, `Room2.unity` как реальных сцен в проекте.
   - Нет требуемых скриптов: `TaskOrchestrator`, `IdleDirector`, Data DTO, full Bots/FSM set.
3. **Webhook pipeline не завершён**
   - Telegram endpoint есть, но без отправки ответа в Telegram API и без секрет-проверки.
4. **Интерактивность ТЗ отсутствует**
   - Нет `LampToggle`, `DoorToRoom`, `ClickableCard` в реальном Unity runtime flow.
5. **Room2 extension отсутствует**
6. **WebGL optimization budget не верифицирован метриками**

## Уже внесённые исправления по достоверности
- Отключена time-based накрутка прогресса в `office/update_state.sh`.
- Убран автостарт шагов без фактического апдейта.
- `tasks.json` перестал перезаписываться автоматически.
- UI «ПРЯМО СЕЙЧАС ДЕЛАЮ» не показывает устаревшие liveOps.
- BuildScript переведён в fail-fast при отсутствии реальной сцены.

## План реализации (строго по ТЗ)
1. **Week 1 Foundation (обязательно)**
   - Зафиксировать backend как source-of-truth.
   - Поднять `office/backend` как systemd service + reverse proxy `/api/*`.
   - Создать реальные Unity сцены `OfficeHub.unity` и `Room2.unity`.
2. **Week 2 State Sync**
   - Ввести единый контракт state: `{ tasks, bots, world }`.
   - Реализовать Unity polling + diff update.
3. **Week 3 Task Flow**
   - `TaskOrchestrator` + Planner/Worker/Tester lifecycle + retry/rework.
4. **Week 4 Idle**
   - `IdleDirector` 6-12s weighted random без конфликта TaskFlow.
5. **Week 5 Interactables**
   - Lamp, door Room2, clickable cards.
6. **Week 6-8**
   - Art pass, perf budget, stability/polish.

## Definition of done check (на сегодня)
- Telegram -> task -> Unity: **не закрыто полностью**.
- Full task lifecycle in Unity: **не закрыто**.
- Idle life: **не закрыто**.
- Lamp toggle / Room2: **не закрыто**.
- WebGL no-lag proof: **не закрыто**.
