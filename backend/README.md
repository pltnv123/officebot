# Office Backend (source of truth API)

## Endpoints
- `GET /health`
- `GET /api/state`
- `POST /api/tasks` body: `{ "title": "..." }`
- `POST /api/toggles/:id` body: `{ "value": true|false }` (optional)
- `POST /telegram/webhook` (Telegram update payload)

## Run
```bash
cd office/backend
npm i
npm start
```

Default port: `8787`
