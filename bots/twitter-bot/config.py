"""
Конфигурация Twitter бота
Заполни credentials перед запуском
"""

# Twitter API Credentials
# Получить на https://developer.twitter.com/
TWITTER_CONFIG = {
    "api_key": "YOUR_API_KEY",
    "api_secret": "YOUR_API_SECRET",
    "access_token": "YOUR_ACCESS_TOKEN",
    "access_token_secret": "YOUR_ACCESS_TOKEN_SECRET",
    "bearer_token": "YOUR_BEARER_TOKEN",
}

# OpenRouter API для генерации контента
# Получить на https://openrouter.ai/
OPENROUTER_CONFIG = {
    "api_key": "YOUR_OPENROUTER_API_KEY",
    "model": "anthropic/claude-3-haiku",  # Быстрый и дешёвый
    "base_url": "https://openrouter.ai/api/v1/chat/completions",
}

# Настройки бота
BOT_SETTINGS = {
    # Паузы между действиями (секунды)
    "post_interval_min": 3600,      # 1 час
    "post_interval_max": 14400,     # 4 часа
    "reply_delay_min": 30,          # 30 сек
    "reply_delay_max": 180,         # 3 мин
    "like_interval_min": 600,       # 10 мин
    "like_interval_max": 1800,      # 30 мин
    "retweet_interval_min": 1800,   # 30 мин
    "retweet_interval_max": 3600,   # 1 час

    # Лимиты за день
    "max_posts_per_day": 8,
    "max_likes_per_day": 50,
    "max_retweets_per_day": 15,
    "max_replies_per_day": 20,

    # Human-like настройки
    "typo_chance": 0.01,            # 1% шанс опечатки
    "morning_hours": (7, 10),       # Утреннее окно
    "evening_hours": (18, 22),      # Вечернее окно
    "active_days": (0, 1, 2, 3, 4), # Пн-Пт (0=Mon)
    "rest_days": (5, 6),            # Сб-Вс (реже постит)
}

# Темы для постов (веса: чем выше, тем чаще)
POST_TOPICS = {
    "ai_automation": {
        "weight": 3,
        "hashtags": ["#AI", "#автоматизация", "#ChatGPT", "# MachineLearning"],
        "keywords": ["нейросеть", "бот", "автоматизация", "AI", "LLM"],
    },
    "productivity": {
        "weight": 2,
        "hashtags": ["#продуктивность", "#productivity", "#lifehack", "#GTD"],
        "keywords": ["效率", "тайм-менеджмент", "фокус", "поток"],
    },
    "dev_tools": {
        "weight": 2,
        "hashtags": ["#разработка", "#programming", "#coding", "#dev"],
        "keywords": ["Python", "API", "скрипт", "GitHub", "CLI"],
    },
    "business_startup": {
        "weight": 2,
        "hashtags": ["#стартап", "#бизнес", "#startup", "#freelance"],
        "keywords": ["клиент", "проект", "стартап", "MVP", "фриланс"],
    },
    "personal_experience": {
        "weight": 1,
        "hashtags": [],
        "keywords": [],
    },
}

# Ключевые слова для поиска постов для лайков/ретвитов
ENGAGEMENT_KEYWORDS = [
    "AI автоматизация",
    "нейросеть для бизнеса",
    "продуктивность фриланс",
    "автоматизация рутины",
    "ChatGPT кейсы",
    "AI инструменты",
    "бот для работы",
    "программирование productivity",
]

# Аккаунты для фоллоу-бэка и мониторинга (опционально)
TARGET_ACCOUNTS = [
    # Добавить аккаунты ниши
]

# Логирование
LOG_CONFIG = {
    "level": "INFO",
    "file": "bot.log",
    "max_bytes": 10_485_760,  # 10MB
    "backup_count": 5,
}
