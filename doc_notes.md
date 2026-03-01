# Документация OpenClaw

## Control UI
- state.json должен содержать актуальные tasks/active/done.
- После любых изменений задач запускать update_state.
- UI показывает прогресс, важно не оставлять "замороженных" задач без статуса.

## Web Control
- Версионирование ресурсов (?v=)
- Статическая раздача из /var/www/office

## Tasks & State
- tasks.json: id/title/status/subtasks.
- state.json должен включать gatewayCpu/load и taskState (для UI). 
