# OfficeBot — Product Architecture

## 🎯 Vision
Персональный AI-ассистент с визуальной сценой (Unity WebGL), доступный в браузере, Telegram и мобильных приложениях.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Web Browser   │    Telegram     │      Mobile App             │
│  (Unity WebGL)  │    Bot API      │    (React Native)           │
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   API GW    │  (nginx / Cloudflare)
                    │  Gateway    │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼─────┐     ┌─────▼─────┐
    │  Auth   │      │   Core    │     │   State   │
    │ Service │      │  Engine   │     │   Store   │
    │(OAuth2) │      │  (Node)   │     │ (Redis)   │
    └─────────┘      └─────┬─────┘     └───────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌────▼─────┐
        │  Agent   │ │  Scene   │ │   Task   │
        │  Pool    │ │  Builder │ │  Queue   │
        │ (LLMs)  │ │ (Unity)  │ │ (Bull)   │
        └──────────┘ └──────────┘ └──────────┘
```

---

## 📦 Components

### 1. Client Layer
| Component | Tech | Description |
|-----------|------|-------------|
| Web App | Unity WebGL + JS | 3D сцена с роботами, UI |
| Telegram | Bot API | Чат-интерфейс с агентами |
| Mobile | React Native | iOS/Android приложение |

### 2. API Gateway
| Component | Tech | Description |
|-----------|------|-------------|
| Gateway | nginx / Cloudflare | TLS, rate limit, routing |
| Auth | OAuth2 (Google, Telegram) | Аутентификация пользователей |

### 3. Core Engine
| Component | Tech | Description |
|-----------|------|-------------|
| Task Router | Node.js | Маршрутизация задач агентам |
| Agent Pool | OpenAI / Claude / Local | Пул LLM для агентов |
| Scene Builder | C# (Unity) | Построение 3D сцены |
| State Store | Redis / PostgreSQL | Хранение состояния |

### 4. Agent System
| Component | Tech | Description |
|-----------|------|-------------|
| PLANNER | LLM | Планирование задач |
| WORKER | LLM | Выполнение задач |
| REVIEWER | LLM | Проверка качества |
| BUILDER | LLM | Деплой и сборка |
| VIZ | LLM | Визуальная проверка |

---

## 🔐 Security

| Layer | Protection |
|-------|------------|
| Transport | TLS 1.3 |
| Auth | OAuth2 + JWT |
| API | Rate limiting, IP whitelist |
| Data | Encryption at rest |
| Secrets | Vault / env vars |

---

## 💰 Monetization Model

### Freemium Tier:
| Feature | Free | Pro ($19/mo) | Business ($49/mo) |
|---------|------|--------------|-------------------|
| Chat агенты | 50 msgs/day | Unlimited | Unlimited |
| Агенты | 5 базовых | Все 112 | Все 112 |
| Unity сцена | Базовая | Pixar-quality | Custom |
| API access | ❌ | ✅ | ✅ |
| Priority | Низкий | Высокий | Highest |
| Support | Community | Email | Dedicated |

---

## 📊 Key Metrics (KPI)

| Metric | Target |
|--------|--------|
| DAU | 1,000 → 10,000 (6 мес) |
| Conversion Free→Pro | 5% |
| Retention Day 7 | 40% |
| Session Time | 15+ min |
| Tasks Completed/Day | 3+ per user |

---

## 🚀 MVP Features (Priority)

### P0 (Must Have):
- [ ] Unity сцена с 3 роботами ✅
- [ ] Telegram бот с агентами
- [ ] Auth (Google + Telegram)
- [ ] 5 базовых агентов
- [ ] Task queue

### P1 (Should Have):
- [ ] Все 112 агентов
- [ ] Прогресс-бар задач
- [ ] История задач
- [ ] Визуальная сцена улучшения

### P2 (Nice to Have):
- [ ] Мобильное приложение
- [ ] API для разработчиков
- [ ] Кастомизация роботов
- [ ] Командная работа

---

## 📁 File Structure
```
office/
├── UnityProject/          # Unity исходники
│   ├── Assets/
│   │   ├── Scripts/       # C# скрипты
│   │   └── Scenes/        # Unity сцены
├── backend/               # Node.js сервер
│   ├── agentRouter.js     # Маршрутизация агентов
│   ├── taskQueue.js       # Очередь задач
│   └── autonomousApi.js   # API для автономной работы
├── agents/                # Агенты agency-agents
│   └── agency/            # 112 агентов
├── scripts/               # Скрипты деплоя
└── docs/                  # Документация
```

---

## 🔮 Future (Post-MVP)

1. **AI Avatar** — Робот-аватар пользователя
2. **Multi-language** — Английский, китайский, испанский
3. **Marketplace** — Пользователи создают своих агентов
4. **Enterprise** — Командные решения для бизнеса
5. **Hardware** — Физический робот (5+ лет)

---

*Создано: 2026-03-16 22:55 UTC*
*Автор: OfficeBot CHIEF*
