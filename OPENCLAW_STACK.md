# OpenClaw Stack — быстрый операционный конспект

## Основные ресурсы
- Сайт: https://openclaw.ai
- Документация: https://docs.openclaw.ai
- GitHub: https://github.com/openclaw/openclaw
- Релизы: https://github.com/openclaw/openclaw/releases
- Discord: https://discord.gg/openclaw
- ClawHub (Skills): https://hub.openclaw.ai

## Гайды/статьи для онбординга
- Habr (RU): https://habr.com/ru/articles/990786/
- DigitalOcean: https://www.digitalocean.com/resources/articles/what-is-openclaw
- Dev.to: https://dev.to/laracopilot/what-is-openclaw-ai-in-2026-a-practical-guide-for-developers-25hj
- AIMLAPI quickstart: https://docs.aimlapi.com/quickstart/openclaw
- Wikipedia: https://en.wikipedia.org/wiki/OpenClaw

## Провайдеры моделей
- OpenRouter (старт): https://openrouter.ai
- Anthropic: https://console.anthropic.com
- OpenAI: https://platform.openai.com
- DeepSeek: https://api.deepseek.com

## Что уже изучено и зафиксировано
- Документация: стартовая страница + подсказка использовать `https://docs.openclaw.ai/llms.txt` как индекс всех страниц.
- Releases: подтверждён рабочий процесс «перед изменениями смотреть changelog»; отмечены важные направления (secrets workflow, ACP/thread sessions, agents bind/unbind, transport changes).
- Habr-гайд: полезен как практический взгляд (архитектура gateway/agent/skills/memory и реальные подводные камни), но использовать как вторичный источник после официальных docs.

## Принятые правила внедрения (локально)
1. Сначала проверять локальные доки OpenClaw в окружении, затем `docs.openclaw.ai`.
2. Для всех новых фич/правок сначала смотреть релизы и changelog.
3. Для повторяемых операций оформлять в виде skills/чеклистов.
4. Для задач по моделям держать fallback-провайдера (OpenRouter + прямые ключи).
5. При диагностике сначала `openclaw status`, затем точечные проверки.
6. Любой внешний гайд (Habr/Dev.to/DO) считать вспомогательным, не источником истины.

## Мини-чеклист перед изменениями
- [ ] Проверен актуальный релиз OpenClaw
- [ ] Проверены breaking changes в docs
- [ ] Определён основной и резервный провайдер модели
- [ ] Есть план отката (backup / commit)
- [ ] Изменения задокументированы в workspace
