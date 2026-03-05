# Office Backend (source of truth API)

## Endpoints
- `GET /health`
- `GET /api/state`
- `GET /api/ops/health`
- `POST /api/tasks` body: `{ "title": "..." }`
- `POST /api/toggles/:id` body: `{ "value": true|false }` (optional)
- `POST /api/orchestrator/tick` (закрывает текущий `doing` subtask и запускает следующий `todo`)
- `POST /telegram/webhook` (Telegram update payload)
  - обычный текст: создаёт новую задачу
  - `/tick` или `/done`: переводит текущий `doing` subtask в `done` и двигает FSM дальше

## Run
```bash
cd office/backend
npm i
npm start
```

Default port: `8787`
