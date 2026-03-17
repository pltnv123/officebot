# OfficeBot — Unified AI Assistant

Telegram bot that combines **Copywriter** and **Secretary** functionality with human-like behavior.

## Features

### 📝 Copywriter
- `/rewrite` — Rewrite text better
- `/blog` — Write a blog post
- `/ad` — Create ad copy (Facebook/Instagram/Google)
- `/product` — Product description
- `/email` — Email for newsletter
- `/social` — Social media post

### 📋 Secretary
- `/remind` — Set a reminder
- `/schedule` — Add to calendar
- `/notes` — Meeting/call notes
- `/email_draft` — Draft a professional email

### ⚙️通用
- `/start` — Welcome message
- `/help` — Show all commands
- `/balance` — Check remaining requests
- `/buy` — Buy more requests (Telegram Stars)

## Human-like Behavior

- **Typing indicator** with random delays (0.4–1.2s)
- **Random emoji** prefixes (but not too many)
- **Activity window**: 8:00–23:00 UTC
- **No group responses** — ignores non-private chats
- **Anti-spam cooldown** between requests
- **Simulated typing speed** — not instant

## Structure

```
officebot/
├── bot.py           # Main bot (all handlers)
├── config.py        # Tokens and settings
├── human.py         # Human-like module
├── prompts.py       # All AI prompts (copywriter + secretary)
├── database.py      # SQLite database
├── requirements.txt
└── README.md
```

## Setup

```bash
pip install -r requirements.txt
nohup python3 bot.py > bot.log 2>&1 &
echo $! > bot.pid
```

## Tech Stack

- **python-telegram-bot** v20+
- **OpenRouter API** (LLaMA 3.1 8B free tier + fallbacks)
- **SQLite** for persistence
- **Telegram Stars** for payments
