# 🤖 AI Secretary Telegram Bot

Профессиональный AI-ассистент-секретарь для Telegram.

## Функционал

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие и информация о квоте |
| `/help` | Список всех команд |
| `/remind 15:00 "Текст"` | Создать напоминание |
| `/schedule "Событие" 14:00` | Записать в расписание |
| `/email addr@domain.com "Тема"` | Составить письмо |
| `/notes "Тема совещания"` | Заметки с совещания |
| `/reminders` | Мои напоминания |
| `/schedule_list` | Моё расписание |
| `/quota` | Баланс запросов |

Также поддерживается свободный чат — просто напишите сообщение!

## Установка

### 1. Клонировать репозиторий

```bash
cd /home/antonbot/.openclaw/workspace/office/bots/ai-secretary
```

### 2. Установить зависимости

```bash
pip install -r requirements.txt
```

### 3. Настроить переменные окружения

```bash
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
export OPENROUTER_API_KEY="your-openrouter-api-key-here"
```

Или создать файл `.env`:

```env
TELEGRAM_BOT_TOKEN=your-bot-token-here
OPENROUTER_API_KEY=your-openrouter-api-key-here
```

### 4. Запустить

```bash
python bot.py
```

## Получение токенов

### Telegram Bot Token
1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте полученный токен

### OpenRouter API Key
1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai)
2. Перейдите в API Keys
3. Создайте новый ключ
4. Бесплатные модели доступны без платёжных данных

## Архитектура

```
ai-secretary/
├── bot.py           # Основной бот (handlers, polling)
├── config.py        # Конфигурация и настройки
├── database.py      # SQLite база данных
├── prompts.py       # Шаблоны промптов для AI
├── requirements.txt # Зависимости
└── secretary.db     # SQLite база (создаётся автоматически)
```

## База данных

SQLite база содержит таблицы:
- `users` — пользователи и квоты
- `reminders` — напоминания
- `notes` — заметки с совещаний
- `schedule` — расписание

## AI Модели

По умолчанию используется бесплатная модель `google/gemma-3-1b-it:free` через OpenRouter.
При недоступности автоматически переключается на резервные модели.

## Анти-бан система

- Случайные задержки перед ответом (0.5-2.0с)
- Human-like typing effect (0.3-1.2с)
- Ограничение на количество запросов
- Автоматическая смена модели при ошибках

## Лицензия

MIT
