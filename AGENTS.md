# Agents — Workspace Rules

## VISUAL PRIORITY LOCK (OVERRIDES EVERYTHING)

The scene at http://5.45.115.12/office/ MUST match the reference image.
Until it does — no other work is allowed.

Reference image shows:
- 3 robots (WORKER left, PLANNER center, REVIEWER right)
- Warm beige floor with tile grid
- Bright warm lighting
- Board with INBOX/PLAN/WORK/DONE columns on back wall
- Low perspective camera

### 5 CONDITIONS TO CHECK EVERY CYCLE START
1. 3 robots visible simultaneously → if NO: fix robots first
2. Floor warm beige → if NO: fix floor color first 
3. Scene bright → if NO: fix ambient light first
4. Board visible and readable → if NO: fix board position first
5. Camera matches reference → if NO: fix camera first

### BACKLOG FREEZE
ops/frontend/backend backlog is FROZEN until all 5 conditions = TRUE.
Do not touch backlog. Do not pick backlog items.
Visual fixes only.

## Жёсткий протокол исполнения

### 1) Non-negotiables
- Никакого фейкового прогресса
- done только при проверяемом результате
- Для Unity/WebGL: сцены должны существовать физически

### 2) Цикл выполнения
1. Проверить 5 visual conditions
2. Если хоть одно FALSE — фикс RuntimeSceneBuilder.cs
3. Push → ждать wasm timestamp → следующий фикс
4. Если все TRUE → можно брать backlog

### 3) Приоритеты
1. ВИЗУАЛЬНАЯ СЦЕНА (все 5 conditions = TRUE)
2. Сквозной поток Telegram→Backend→State→Frontend→Unity
3. TaskOrchestrator + FSM
4. Idle/Interactables/Room2

### 4) CI дисциплина
- Один push → ждать green → следующий push
- Никогда не пушить пока идёт билд
- Проверять: stat /var/www/office/Build/WebGL.wasm.gz | grep Modify
- После каждого зелёного CI билда — делать скриншот http://5.45.115.12/office/ и сразу отправлять в Telegram. Никаких исключений.

### 5) Отчётность
- Каждые 30 минут статус в Telegram
- Формат: 1)Сделано 2)В работе 3)Следующий шаг 4)ETA
