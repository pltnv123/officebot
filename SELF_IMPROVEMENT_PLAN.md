# Self-Improvement Plan для OfficeBot

## Обзор

Этот документ описывает, как использовать методологии 7 специализированных агентов для самообучения и автоматического улучшения системы. Каждый агент приносит уникальную перспективу, которую можно применить автономно.

---

## 1. Анализ агентов и их применения

### 🏛️ Software Architect (eng-software-architect.md)

**Сильные стороны:** Системное мышление, trade-off анализ, ADR документация

**Применение для самостоятельной работы:**

| Методология | Как применить | Конкретное действие |
|---|---|---|
| ADR (Architecture Decision Record) | Документировать каждое архитектурное решение | Создать `docs/adr/` директорию, шаблон ADR-001.md |
| Trade-off Matrix | Взвешивать варианты перед рефакторингом | Скрипт: предложить 2+ варианта решения перед изменением |
| Bounded Context | Определять границы модулей | Проверять: файлы >500 строк → предложить разделить |
| C4 Diagram | Визуализировать архитектуру | Генерировать текстовое описание связей между файлами |

**Конкретные действия:**
1. Перед каждым рефакторингом писать мини-ADR (3 предложения: Context, Decision, Consequences)
2. Раз в неделю проверять файлы на размер — предупреждать если >300 строк
3. Вести `docs/DECISIONS.md` — лог всех архитектурных решений

---

### 👁️ Code Reviewer (eng-code-reviewer.md)

**Сильные стороны:** Систематический ревью, приоритизация проблем, образовательный подход

**Применение для самостоятельной работы:**

| Методология | Как применить | Конкретное действие |
|---|---|---|
| Priority Markers (🔴🟡💭) | Классифицировать найденные проблемы | В отчёте: Blockers / Suggestions / Nits |
| Review Checklist | Проверять код по чеклисту | Автоматизировать: grep паттерны для частых проблем |
| Explain Why | Всегда объяснять причину | В логах: проблема + почему это плохо + как исправить |
| Praise Good Code | Отмечать хорошие паттерны | Добавить секцию "Что хорошо" в отчёт |

**Конкретные действия:**
1. Скрипт проверки: null-референсы, hardcoded значения, отсутствие error handling
2. Проверять: `GetComponent` без null-check в Unity C#
3. Проверять: `console.log` в production коде
4. Формировать отчёт с приоритетами: 🔴 Must Fix → 🟡 Should Fix → 💭 Nice to Have

---

### 🚨 Incident Response Commander (eng-incident-response-commander.md)

**Сильные стороны:** Структурированный ответ на инциденты, постмортемы, SLO/SLI

**Применение для самостоятельной работы:**

| Методология | Как применить | Конкретное действие |
|---|---|---|
| Severity Matrix (SEV1-4) | Классифицировать проблемы по критичности | CI red = SEV3, сцена сломана = SEV2, data loss = SEV1 |
| Timeline Documentation | Вести хронологию изменений | Git log → timeline в отчёте |
| 5 Whys Analysis | Анализ корневой причины | При повторной ошибке: запускать 5 Whys |
| Post-Mortem Template | Документировать инциденты | Шаблон для логов: что произошло → почему → что исправлено |

**Конкретные действия:**
1. При CI failure: автоматически создать инцидент-отчёт с timeline
2. При повторной ошибке (встречается 2+ раз): запустить 5 Whys анализ
3. Вести `INCIDENT_LOG.md` — историю всех проблем и решений
4. Классифицировать: Build Failure → SEV3, Scene Broken → SEV2, Data Corruption → SEV1

---

### 🛡️ SRE (eng-sre.md)

**Сильные стороны:** SLO/error budgets, observability, toil reduction, golden signals

**Применение для самостоятельной работы:**

| Методология | Как применить | Конкретное действие |
|---|---|---|
| Golden Signals | Мониторить 4 ключевых метрики | Latency (build time), Traffic (запросы), Errors (CI fails), Saturation (диск) |
| Error Budget | Отслеживать "бюджет ошибок" | 3 fails подряд → freeze на фикс |
| Toil Reduction | Автоматизировать рутину | Если действие повторяется 3+ раза → скрипт |
| Progressive Rollouts | Пошаговое развёртывание | Коммит → CI green → скриншот → только потом report |

**Конкретные действия:**
1. Error Budget: максимум 3 failed CI builds в день, иначе — только фиксы
2. Мониторинг: скрипт проверяет build time, если >10 мин — предупреждение
3. Toil tracker: логировать повторяющиеся ручные действия, предложения по автоматизации
4. SLO для CI: 95% успешных сборок за последние 24 часа

---

### 🔒 Security Engineer (eng-security-engineer.md)

**Сильные стороны:** Threat modeling, OWASP Top 10, secure coding, CI/CD security

**Применение для самостоятельной работы:**

| Методология | Как применить | Конкретное действие |
|---|---|---|
| OWASP Top 10 Check | Проверять код на уязвимости | grep: eval(), innerHTML, hardcoded secrets |
| Threat Model | Оценивать риски изменений | Новое API → проверить auth, input validation |
| Secrets Detection | Искать утечки секретов | regex: API keys, tokens, passwords в коде |
| Security Headers | Проверять конфигурации | CSP, CORS на веб-эндпоинтах |

**Конкретные действия:**
1. При каждом коммите: grep на hardcoded secrets (API_KEY=, token=, password=)
2. Проверять: нет ли `eval()` или `innerHTML` в JS файлах
3. Проверять: открытые порты, debug режим в production
4. Логировать findings в `SECURITY_AUDIT.md`

---

### 🧭 Product Manager (prod-manager.md)

**Сильные стороны:** Приоритизация, RICE scoring, roadmap, success metrics

**Применение для самостоятельной работы:**

| Методология | Как применить | Конкретное действие |
|---|---|---|
| RICE Prioritization | Приоритизировать задачи | Reach × Impact × Confidence ÷ Effort для backlog |
| Success Metrics | Определять метрики успеха | Каждая задача → какая метрика улучшится |
| Now/Next/Later | Структурировать roadmap | Разделять backlog: Now (сделать сейчас), Next (далее), Later (когда-нибудь) |
| Scope Discipline | Предотвращать scope creep | Отслеживать: каждое изменение документировать |

**Конкретные действия:**
1. Раз в день: обновить `BACKLOG.md` с приоритетами (Now/Next/Later)
2. Для каждой задачи указать: Success Metric, Effort (S/M/L), Confidence
3. Отслеживать scope creep: если задача расширилась — залогировать
4. Weekly report: что сделано vs что планировалось

---

### 🔌 API Tester (test-api-tester.md)

**Сильные стороны:** Комплексное тестирование, security testing, performance, automation

**Применение для самостоятельной работы:**

| Методология | Как применить | Конкретное действие |
|---|---|---|
| Test Coverage | Отслеживать покрытие тестов | Если файл >200 строк без тестов → предупреждение |
| Security Testing | Тестировать edge cases | Пустые входы, SQL injection, XSS в URL параметрах |
| Performance Testing | Проверять скорость | Замерять build time, render time сцены |
| Contract Testing | Проверять API контракты | Валидировать JSON структуры state.json |

**Конкретные действия:**
1. Проверять наличие тестов: `.test.js`, `.spec.js` рядом с исходниками
2. Запускать `npm test` если доступно
3. Performance: замерять и логировать время CI билда
4. Проверять JSON валидность: `state.json`, `tasks.json`

---

## 2. Интеграция в Pipeline

### Ежедневный цикл самообучения

```
Morning Check (автоматически):
├── 1. SRE: Проверить Golden Signals (диск, память, build time)
├── 2. Security: Scan для новых секретов в коде
├── 3. Code Review: Проверить не прошедшие ревью файлы
├── 4. PM: Обновить backlog приоритеты
└── 5. SRE: Проверить Error Budget (сколько fails сегодня)

Per-Commit Check:
├── 1. Code Reviewer: Быстрый scan изменённых файлов
├── 2. Security: Проверка на секреты
├── 3. API Tester: Запуск тестов если есть
└── 4. Incident Commander: Логировать если CI red

Weekly Review:
├── 1. Architect: Review архитектуры, ADR обновления
├── 2. SRE: Toil reduction analysis
├── 3. PM: RICE scoring для новых задач
└── 4. Incident Commander: Pattern analysis инцидентов
```

### Метрики самообучения

| Метрика | Целевое значение | Измерение |
|---|---|---|
| CI Success Rate | ≥95% | `gh run list` за 24ч |
| Build Time | <8 min | Замер каждого билда |
| Security Findings | 0 Critical | Результат скрипта security |
| Code Review Coverage | 100% новых файлов | Проверка что все файлы проверены |
| Incident Response Time | <5 min detect | Время от ошибки до лога |
| Toil Reduction | +1 авто/неделю | Счётчик автоматизаций |

---

## 3. Контрольный список для Антона

### Каждый день проверять:
- [ ] `INCIDENT_LOG.md` — новые инциденты?
- [ ] `SECURITY_AUDIT.md` — найдены уязвимости?
- [ ] Error Budget — не превышен лимит fails?

### Каждую неделю:
- [ ] `docs/DECISIONS.md` — новые ADR?
- [ ] Backlog приоритеты актуальны?
- [ ] Toil tracker — что можно автоматизировать?

### Каждый месяц:
- [ ] Архитектурный обзор: файлы >300 строк?
- [ ] Security аудит: полный scan
- [ ] SLO review: CI success rate, build times
- [ ] Incident pattern analysis: повторяются ли проблемы?

---

## 4. Полезные команды для скрипта

```bash
# Запуск полной проверки
bash scripts/ops/agent_self_check.sh

# Только security scan
bash scripts/ops/agent_self_check.sh --security

# Только CI статус
bash scripts/ops/agent_self_check.sh --ci

# Только архитектура
bash scripts/ops/agent_self_check.sh --arch
```

---

*Документ создан на основе 7 агентов из `agents/agency/`.*
*Последнее обновление: 2026-03-17*
