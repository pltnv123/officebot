# 🤖 AI Copywriter Telegram Bot

Telegram-бот для создания продающих текстов с помощью AI (OpenRouter API).

## 📋 Команды

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие + бесплатные запросы |
| `/rewrite` | Переписать текст лучше |
| `/blog` | Написать блог-пост |
| `/generate` | Alias для /blog |
| `/ad` | Рекламный текст (FB/IG/Google) |
| `/product` | Описание товара |
| `/email` | Email для рассылки |
| `/social` | Пост для соцсетей |
| `/balance` | Проверить баланс запросов |
| `/buy` | Купить запросы (Telegram Stars) |
| `/help` | Список команд |

## 🚀 Запуск

### 1. Установка зависимостей

```bash
cd office/bots/ai-copywriter/
pip install -r requirements.txt
```

### 2. Настройка переменных окружения

```bash
export BOT_TOKEN="your_telegram_bot_token"
export OPENROUTER_API_KEY="your_openrouter_api_key"
```

Или отредактируйте `config.py` напрямую.

### 3. Запуск бота

```bash
python bot.py
```

## 💰 Модель

- **10 бесплатных запросов** при регистрации
- **Покупка через Telegram Stars** — 20 запросов за Stars
- По умолчанию используется бесплатная модель `meta-llama/llama-3.1-8b-instruct:free`

## 🛡 Защита

- Anti-spam cooldown (3 секунды между запросами)
- Лимит длины ввода/вывода
- JSON-хранилище пользователей

## 📁 Структура

```
ai-copywriter/
├── bot.py           # Основной бот
├── config.py        # Конфигурация
├── prompts.py       # Промпты для AI
├── requirements.txt # Зависимости
├── users.json       # База пользователей (создаётся автоматически)
└── README.md        # Этот файл
```

## 🔧 Настройка через config.py

| Параметр | Описание |
|----------|----------|
| `FREE_REQUESTS` | Бесплатные запросы при старте (10) |
| `COOLDOWN_SECONDS` | Задержка между запросами (3) |
| `PRICE_PER_REQUEST` | Цена 1 запроса в Stars (1) |
| `REQUESTS_PER_STARS` | Запросов за Stars-пакет (20) |
| `FREE_MODEL` | Модель для бесплатных пользователей |
| `PREMIUM_MODEL` | Премиум модель (для будущего) |
