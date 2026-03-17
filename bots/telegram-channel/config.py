"""
Configuration for OfficeBot Channel Manager
Telegram Channel Bot — ведёт канал как живой человек
"""

import os

# ─── Telegram Bot Token (отдельный бот для канала) ───
BOT_TOKEN = os.getenv(
    "CHANNEL_BOT_TOKEN",
    "8240980129:AAGKefo5bd2wgHWiDdic1Sk-Kzjx-N9f3p4"
)

# ─── Channel ID (куда постить) ───
CHANNEL_ID = os.getenv(
    "CHANNEL_ID",
    "@officebot_ai"  # Заменить на реальный ID канала
)

# ─── OpenRouter API ───
OPENROUTER_API_KEY = os.getenv(
    "OPENROUTER_API_KEY",
    "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"
)
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# ─── Models ───
AI_MODEL = "meta-llama/llama-3.1-8b-instruct:free"
FALLBACK_MODELS = [
    "google/gemma-3-1b-it:free",
    "mistralai/mistral-7b-instruct:free",
]

# ─── Content Schedule (UTC, Moscow = UTC+3) ───
POST_SCHEDULE = {
    "morning":    {"hour": 6,  "minute": 0,  "type": "greeting"},     # 09:00 MSK
    "midday":     {"hour": 9,  "minute": 0,  "type": "case_study"},   # 12:00 MSK
    "afternoon":  {"hour": 12, "minute": 0,  "type": "tutorial"},     # 15:00 MSK
    "evening":    {"hour": 15, "minute": 0,  "type": "interactive"},  # 18:00 MSK
    "night":      {"hour": 18, "minute": 0,  "type": "summary"},      # 21:00 MSK
}

# ─── Reply Settings ───
REPLY_CHECK_INTERVAL = 120     # секунд — как часто проверять комментарии
MAX_REPLIES_PER_HOUR = 10      # лимит ответов
REPLY_PROBABILITY = 0.6        # шанс ответить на комментарий (60%)

# ─── Limits ───
MAX_POST_LENGTH = 4000
MAX_CAPTION_LENGTH = 1024

# ─── Database ───
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "channel.db")

# ─── Logging ───
LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot.log")

# ─── Activity hours (UTC) ───
ACTIVE_HOUR_START = 5   # 08:00 MSK
ACTIVE_HOUR_END = 21    # 00:00 MSK
