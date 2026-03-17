"""
Configuration for OfficeBot — Unified AI Assistant
"""

import os

# ─── Telegram Bot Token ───
BOT_TOKEN = os.getenv(
    "OFFICEBOT_TOKEN",
    "8240980129:AAGKefo5bd2wgHWiDdic1Sk-Kzjx-N9f3p4"
)

# ─── OpenRouter API ───
OPENROUTER_API_KEY = os.getenv(
    "OPENROUTER_API_KEY",
    "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"
)
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# ─── Models ───
FREE_MODEL = "meta-llama/llama-3.1-8b-instruct:free"
PREMIUM_MODEL = "anthropic/claude-3.5-sonnet"
FALLBACK_MODELS = [
    "google/gemma-3-1b-it:free",
    "huggingface/zephyr-7b-beta:free",
    "mistralai/mistral-7b-instruct:free",
]

# ─── Quota ───
FREE_REQUESTS = 10
PRICE_PER_REQUEST = 1          # Stars per request
REQUESTS_PER_STARS = 20        # Requests granted per Stars purchase

# ─── Database ───
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "officebot.db")

# ─── Cooldowns & Delays ───
COOLDOWN_SECONDS = 3           # Anti-spam between requests
TYPING_DELAY_MIN = 0.4         # Human typing indicator minimum
TYPING_DELAY_MAX = 1.2         # Human typing indicator maximum
RESPONSE_DELAY_MIN = 0.5       # Pause before responding
RESPONSE_DELAY_MAX = 2.0       # Max pause before responding

# ─── Limits ───
MAX_INPUT_LENGTH = 4000
MAX_OUTPUT_TOKENS = 3000

# ─── Reminder background job ───
REMINDER_CHECK_INTERVAL = 30   # seconds

# ─── Activity hours (UTC) ───
# Moscow (UTC+3) → 8:00-23:00 local = 5:00-20:00 UTC
ACTIVE_HOUR_START = 5
ACTIVE_HOUR_END = 20
