# config.py — Configuration for AI Secretary Bot
import os

# Telegram Bot Token (set via env or hardcode for local dev)
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# OpenRouter API Key for AI generation
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Free-tier model (cost-efficient)
DEFAULT_MODEL = "google/gemma-3-1b-it:free"
# Fallback models if primary is unavailable
FALLBACK_MODELS = [
    "google/gemma-3-1b-it:free",
    "huggingface/zephyr-7b-beta:free",
    "mistralai/mistral-7b-instruct:free",
]

# User quota: free requests on /start
FREE_REQUESTS = 10

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "secretary.db")

# Reminder check interval (seconds)
REMINDER_CHECK_INTERVAL = 30

# Typing delay range (seconds) — human-like effect
TYPING_DELAY_MIN = 0.3
TYPING_DELAY_MAX = 1.2

# Anti-ban: random delay before responding (seconds)
RESPONSE_DELAY_MIN = 0.5
RESPONSE_DELAY_MAX = 2.0

# Max response length (tokens)
MAX_TOKENS = 1024

# Supported languages
LANGUAGES = ["ru", "en"]
