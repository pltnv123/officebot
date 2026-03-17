"""
Human-like behavior module for OfficeBot.

Features:
  - Simulated typing indicator with random delays
  - Random emoji prefixes (but not too many)
  - Random pauses between "sentences"
  - Activity time window (8:00-23:00 local)
  - Ignore group chats (anti-spam)
  - Occasional typos (1% chance, disabled by default for quality)
"""

import asyncio
import random
from typing import Optional

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import ContextTypes

from config import (
    TYPING_DELAY_MIN,
    TYPING_DELAY_MAX,
    RESPONSE_DELAY_MIN,
    RESPONSE_DELAY_MAX,
    ACTIVE_HOUR_START,
    ACTIVE_HOUR_END,
)
from prompts import random_emoji


# ═══════════════════════════════════════════════════════════════════════════
# TYPING EFFECT
# ═══════════════════════════════════════════════════════════════════════════

async def simulate_typing(
    chat_id: int,
    context: ContextTypes.DEFAULT_TYPE,
    duration: Optional[float] = None,
):
    """Show a typing indicator with a human-like random delay."""
    if duration is None:
        duration = random.uniform(TYPING_DELAY_MIN, TYPING_DELAY_MAX)
    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)
    await asyncio.sleep(duration)


async def pre_response_delay():
    """Random pause before sending a response — feels more natural."""
    await asyncio.sleep(random.uniform(RESPONSE_DELAY_MIN, RESPONSE_DELAY_MAX))


# ═══════════════════════════════════════════════════════════════════════════
# MESSAGE SENDING WITH HUMAN TOUCH
# ═══════════════════════════════════════════════════════════════════════════

async def send_human_message(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    text: str,
    prefix_category: str = "done",
    add_emoji_prefix: bool = True,
    max_chunk: int = 4096,
):
    """
    Send a message with human-like touches:
      - Typing indicator
      - Optional emoji prefix (1 emoji at the start)
      - Natural delay before sending
    """
    chat_id = update.effective_chat.id

    # Typing simulation
    await simulate_typing(chat_id, context)
    await pre_response_delay()

    # Optional emoji prefix
    if add_emoji_prefix and text:
        prefix = random_emoji(prefix_category)
        # Only add if text doesn't already start with an emoji
        if not text[0].isalpha():
            full_text = text
        else:
            full_text = f"{prefix} {text}"
    else:
        full_text = text

    # Split into chunks for Telegram's 4096 char limit
    chunks = _split_text(full_text, max_chunk)

    for i, chunk in enumerate(chunks):
        if i > 0:
            # Small delay between chunks
            await asyncio.sleep(random.uniform(0.3, 0.8))
            await simulate_typing(chat_id, context, duration=0.3)

        await context.bot.send_message(chat_id=chat_id, text=chunk)


def _split_text(text: str, max_len: int = 4096) -> list[str]:
    """Split text into chunks without cutting words."""
    if len(text) <= max_len:
        return [text]

    chunks = []
    while text:
        if len(text) <= max_len:
            chunks.append(text)
            break

        # Find a good split point
        split_at = text.rfind("\n", 0, max_len)
        if split_at < max_len // 2:
            split_at = text.rfind(" ", 0, max_len)
        if split_at < max_len // 2:
            split_at = max_len

        chunks.append(text[:split_at])
        text = text[split_at:].lstrip()

    return chunks


# ═══════════════════════════════════════════════════════════════════════════
# ACTIVITY CHECK (8:00-23:00)
# ═══════════════════════════════════════════════════════════════════════════

def is_active_hours() -> bool:
    """Check if current UTC hour is within active window."""
    from datetime import datetime
    hour = datetime.utcnow().hour
    return ACTIVE_HOUR_START <= hour < ACTIVE_HOUR_END


def get_out_of_hours_message() -> str:
    """Friendly message for out-of-hours queries."""
    return (
        f"{random_emoji('waiting')} Привет! Сейчас нерабочее время.\n"
        f"Я отвечаю с {ACTIVE_HOUR_START}:00 до {ACTIVE_HOUR_END}:00 (UTC).\n"
        f"Напиши утром — не забуду! 😴"
    )


# ═══════════════════════════════════════════════════════════════════════════
# GROUP CHAT CHECK
# ═══════════════════════════════════════════════════════════════════════════

def is_private_chat(update: Update) -> bool:
    """Return True if the message is from a private chat (not a group)."""
    chat = update.effective_chat
    return chat is not None and chat.type == "private"


# ═══════════════════════════════════════════════════════════════════════════
# OCCASIONAL TYPO (cosmetic, 1% chance)
# ═══════════════════════════════════════════════════════════════════════════

_RUSSIAN_KEYBOARD_MAP = {
    "ё": "е", "й": "и", "ц": "с", "у": "и", "к": "л",
    "е": "ё", "н": "т", "г": "п", "ш": "щ", "щ": "ш",
    "з": "э", "х": "р", "ъ": "ь", "ф": "а", "ы": "и",
    "в": "ф", "а": "о", "п": "р", "р": "к", "о": "е",
    "л": "д", "д": "л", "ж": "э", "э": "ж", "я": "ч",
    "ч": "ш", "с": "ы", "м": "ь", "и": "у", "т": "н",
    "ь": "б", "б": "ь", "ю": "е",
}


def maybe_typo(text: str, chance: float = 0.01) -> str:
    """
    Introduce a random typo with given probability.
    Disabled by default (chance=0.01 = 1% per call).
    """
    if random.random() > chance:
        return text

    # Pick a random Russian letter to swap
    chars = list(text)
    russian_positions = [i for i, c in enumerate(chars) if c.lower() in _RUSSIAN_KEYBOARD_MAP]

    if not russian_positions:
        return text

    pos = random.choice(russian_positions)
    original = chars[pos]
    replacement = _RUSSIAN_KEYBOARD_MAP.get(original.lower(), original)
    chars[pos] = replacement if original.islower() else replacement.upper()

    return "".join(chars)
