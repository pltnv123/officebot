# 📸 Instagram Bot для Platonov.AI

Автоматизированный Instagram бот для продвижения AI-продуктов.

## 🎯 Что умеет

- 📝 **Автоматическая публикация постов** — 1 пост/день
- 📱 **Stories** — 3 Stories/день  
- 💬 **Ответы на сообщения** — human-like ответы
- ❤️ **Auto-engagement** — лайки и комментарии по хештегам
- 🖼️ **Генерация изображений** — карточки, инфографика, карусели
- 📅 **Планировщик контента** — дневной и недельный план

## 📁 Структура проекта

```
instagram-bot/
├── bot.py              # Основной бот (публикация, ответы, engagement)
├── content_planner.py  # Планировщик контента
├── image_generator.py  # Генератор изображений
├── human.py            # Human-like модуль (задержки, истории, тон)
├── config.py           # Настройки бренда и бота
├── requirements.txt    # Зависимости
└── output/             # Сгенерированные файлы
    ├── images/         # Изображения
    ├── plans/          # Планы контента
    └── logs/           # Логи
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 2. Настройка переменных окружения

Создайте `.env` файл:

```env
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password
INSTAGRAM_API_KEY=your_api_key  # опционально
```

### 3. Запуск демо

```bash
python bot.py
```

## 📝 Модули

### bot.py — Основной бот

```python
from bot import InstagramBot

# Создать бота (dry_run=True для тестирования)
bot = InstagramBot(dry_run=True)

# Опубликовать пост
bot.create_and_publish_post(category="ai_tips")

# Опубликовать Story
bot.create_and_publish_story(category="behind_scenes")

# Ответить на сообщение
reply = bot.reply_to_message("Привет!", "username")

# Запустить ежедневный цикл
bot.run_daily()
```

### content_planner.py — Планировщик

```python
from content_planner import ContentPlanner

planner = ContentPlanner()

# Создать пост
post = planner.generate_post(category="ai_tips")

# Создать Story
story = planner.generate_story()

# План на день
daily = planner.generate_daily_plan()

# План на неделю
weekly = planner.generate_weekly_plan()
```

### image_generator.py — Генератор изображений

```python
from image_generator import ImageGenerator

gen = ImageGenerator()

# Карточка с цитатой
gen.create_quote_card("AI меняет мир", author="Platonov.AI")

# Карточка с советами
gen.create_tip_card("5 AI-советов", ["Совет 1", "Совет 2", "Совет 3"])

# Инфографика
gen.create_infographic("Статистика", {"items": [...]})

# Карусель
gen.create_carousel("Туториал", slides=[...])

# Story
gen.create_story_template("Новый пост!")
```

### human.py — Human-like модуль

```python
from human import Humanizer, PersonalExperience

# Случайная задержка
Humanizer.random_delay(2, 10)

# Добавить эмодзи
Humanizer.add_emoji("Текст", "positive", 1)

# Сделать персональным
Humanizer.make_personal("Совет", "tip")

# Сгенерировать историю
story = Humanizer.generate_story()

# Личный опыт
PersonalExperience.format_as_story()
```

### config.py — Настройки

```python
from config import BRAND, CONTENT, HASHTAGS, INSTAGRAM

# Бренд
BRAND.name = "Platonov.AI"
BRAND.primary_color = "#6C63FF"

# Контент
CONTENT.posts_per_day = 1
CONTENT.stories_per_day = 3

# Хештеги
hashtags = HASHTAGS.get_hashtags("ai_tips", 15)

# Instagram настройки
INSTAGRAM.auto_like = False
INSTAGRAM.reply_to_dms = True
```

## 🎨 Контент-стратегия

### Темы (с весами)

| Категория | % | Описание |
|-----------|---|----------|
| AI Tips | 30% | Советы по использованию AI |
| Case Studies | 25% | Кейсы до/после автоматизации |
| Tutorials | 20% | Пошаговые инструкции |
| Behind Scenes | 15% | Личный опыт, рабочий процесс |
| Results | 10% | Метрики, скриншоты, цифры |

### Хештеги

**Основные (всегда):**
`#AI` `#автоматизация` `#продуктивность` `#IT` `#PlatonovAI` `#pltnv`

**По категориям:**
- AI: `#ChatGPT` `#нейросети` `#machinelearning`
- Кейсы: `#кейс` `#автоматизациябизнеса`
- Tutorials: `#туториал` `#howto`
- Behind scenes: `#behindthescenes` `#деньизжизни`
- Results: `#результат` `#метрики`

### Human-like подход

- ✅ Пишем от первого лица
- ✅ Делимся "личным опытом"
- ✅ Умеренные эмодзи
- ✅ Случайные задержки
- ✅ Не шаблонный текст
- ❌ Не перегружаем хештегами
- ❌ Не используем каверки на русский

## 📊 Статистика

Бот автоматически собирает статистику:

```python
bot.get_stats()
# {
#   "posts_published": 5,
#   "stories_published": 15,
#   "replies_sent": 23,
#   "likes_given": 150,
#   "errors": 0
# }
```

## ⚙️ Настройка безопасности

В `config.py` настроены лимиты:

```python
INSTAGRAM.max_posts_per_day = 3
INSTAGRAM.max_stories_per_day = 10
INSTAGRAM.max_likes_per_hour = 30
INSTAGRAM.max_comments_per_hour = 10
INSTAGRAM.min_delay_seconds = 3.0
INSTAGRAM.max_delay_seconds = 15.0
```

## 🔄 Ежедневный цикл

```python
bot.run_daily()
```

1. 📅 Планирование контента
2. 📝 Публикация поста
3. 📱 Публикация Stories
4. ❤️ Auto-engagement (если включён)
5. 📊 Сохранение статистики

## 📝 TODO

- [ ] Интеграция с Instagram API (instagrapi)
- [ ] Расширенный AI для ответов на сообщения
- [ ] A/B тестирование заголовков
- [ ] Телеграм-уведомления о публикациях
- [ ] Веб-дашборд для управления
- [ ] Поддержка Reels

## 📄 Лицензия

MIT

---

**Бренд:** Platonov.AI / pltnv IT  
**Автор:** Anton  
**2025**
