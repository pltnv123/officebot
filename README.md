# Office (Unity WebGL + backend)

## Что есть
- Frontend: `index.html` + `scripts/tasks-ui.js`
- Backend API: `backend/server.js`
- Источник состояния: `GET /api/state` (fallback в фронте: `./state.json`)

## Запуск backend
```bash
cd /home/antonbot/.openclaw/workspace/office/backend
npm install
npm start
```
По умолчанию backend слушает `http://localhost:8787`.

## Запуск фронта локально
Из каталога `office` подними любой статический сервер (пример):
```bash
cd /home/antonbot/.openclaw/workspace/office
python3 -m http.server 8080
```
Открой: `http://localhost:8080/index.html`

## Проверка e2e
1. Убедись, что backend запущен (`/health`):
```bash
curl -s http://localhost:8787/health
```
2. Создай задачу через API:
```bash
curl -s -X POST http://localhost:8787/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Проверка e2e задачи"}'
```
3. Переключи toggle:
```bash
curl -s -X POST http://localhost:8787/api/toggles/lights \
  -H 'Content-Type: application/json' \
  -d '{}'
```
4. Проверь состояние:
```bash
curl -s http://localhost:8787/api/state | head
```
5. Открой фронт и проверь:
   - в блоке **Backend client** можно добавить задачу и дернуть toggle;
   - статус API в UI показывает, откуда читается состояние:
     - `API: /api/state` — backend доступен;
     - `API: fallback state.json` — работает fallback.

## Быстрый smoke-test fallback
Останови backend и обнови страницу. UI должен продолжить отрисовку через `state.json`.
