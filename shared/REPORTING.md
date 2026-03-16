# REPORTING — Автоматические отчёты в Telegram

## ПРАВИЛО
КАЖДОЕ выполненное действие должно быть отправлено в Telegram топик.

## Как отчитаться
```bash
bash /home/antonbot/.openclaw/workspace/office/scripts/telegram/agent_report.sh <agent> "<сообщение>"
```

## Агенты и их топики
| Агент | Топик | thread_id |
|-------|-------|-----------|
| main/chief | 🏠 Главный | 3 |
| planner | 📋 Planner | 4 |
| worker | 🔧 Worker | 5 |
| reviewer | 🔍 Reviewer | 6 |
| builder | 🏗️ Builder | 7 |
| vreviewer | 👁️ VReviewer | 8 |

## Когда отчитываться
- ✅ Задача выполнена
- 📦 Коммит сделан
- 🔨 Сборка завершена
- 📸 Скриншот сделан
- ❌ Ошибка/провал
- 🔄 Смена статуса в PIPELINE.md

## Формат отчёта
```
[HH:MM UTC] <emoji> <агент>: <что сделано>
```

## Примеры
```bash
bash agent_report.sh worker "✅ Коммит abc123: добавил OfficeStateSnapshot.cs"
bash agent_report.sh builder "🏗️ WASM собран, deploy завершён"
bash agent_report.sh reviewer "❌ Код не прошёл проверку: нет null-check"
bash agent_report.sh vreviewer "📸 Скриншот: роботы видны, пол бежевый ✅"
```
