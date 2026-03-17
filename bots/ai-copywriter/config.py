"""
Configuration for AI Copywriter Telegram Bot
"""

import os

# Telegram Bot Token (set via env or hardcoded for dev)
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")

# OpenRouter API Key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "YOUR_OPENROUTER_KEY_HERE")

# OpenRouter API endpoint
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Free model for cost savings
FREE_MODEL = "meta-llama/llama-3.1-8b-instruct:free"

# Premium model (for paid users)
PREMIUM_MODEL = "anthropic/claude-3.5-sonnet"

# Free requests on start
FREE_REQUESTS = 10

# Telegram Stars price per request (in Stars)
PRICE_PER_REQUEST = 1  # 1 Star = 1 request

# Requests per Stars purchase
REQUESTS_PER_STARS = 20

# Database file for user state
DB_FILE = "users.json"

# Anti-spam: cooldown between requests (seconds)
COOLDOWN_SECONDS = 3

# Typing effect speed range (seconds per character)
TYPING_SPEED_MIN = 0.01
TYPING_SPEED_MAX = 0.04

# Max text length for processing
MAX_INPUT_LENGTH = 4000

# Max output length
MAX_OUTPUT_LENGTH = 3000
