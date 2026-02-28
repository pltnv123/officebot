# TOOLS

- Сцена: http://5.45.115.12/office/index.html?v=2
- Логи: /var/www/office/state.json

## OpenClaw knowledge base
- Конспект ресурсов и правил внедрения: `OPENCLAW_STACK.md`
- Базовый приоритет источников: локальные docs -> GitHub releases -> внешние статьи
- Базовый провайдерный подход: OpenRouter как старт + прямые ключи OpenAI/Anthropic/DeepSeek как fallback

## Оркестрация агентов (важно)
- Модель ролей (Planner/Worker/Test-Runner/Debugger/Reviewer/Documenter/Refactor/Security/Senior) платформо-агностична.
- Применять одинаково для Cursor, Claude и OpenClaw/ACP: меняются только команды и файловая структура.
- При кодинге придерживаться фаз: планирование -> реализация+тесты+фиксы -> финальная документация.
