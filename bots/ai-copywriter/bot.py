#!/usr/bin/env python3
"""
AI Copywriter Telegram Bot
==========================
Telegram bot that uses OpenRouter API to generate marketing copy.

Commands:
    /start      - Welcome message + free requests
    /rewrite    - Rewrite text better
    /generate   - Generate blog post
    /blog       - Alias for /generate
    /ad         - Create ad copy (Facebook/Instagram/Google)
    /product    - Product description
    /email      - Email for newsletter
    /social     - Social media post
    /balance    - Check remaining requests
    /help       - Show all commands
"""

import asyncio
import json
import os
import random
import time
from datetime import datetime
from pathlib import Path

import httpx
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, LabeledPrice
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    PreCheckoutQueryHandler,
    ContextTypes,
    filters,
)

from config import (
    BOT_TOKEN,
    OPENROUTER_API_KEY,
    OPENROUTER_URL,
    FREE_MODEL,
    PREMIUM_MODEL,
    FREE_REQUESTS,
    PRICE_PER_REQUEST,
    REQUESTS_PER_STARS,
    DB_FILE,
    COOLDOWN_SECONDS,
    TYPING_SPEED_MIN,
    TYPING_SPEED_MAX,
    MAX_INPUT_LENGTH,
    MAX_OUTPUT_LENGTH,
)
from prompts import get_prompt, random_emoji

# ─── User Database ───────────────────────────────────────────────────────────

class UserDB:
    """Simple JSON-based user database."""

    def __init__(self, path: str = DB_FILE):
        self.path = Path(path)
        self.data = self._load()

    def _load(self) -> dict:
        if self.path.exists():
            with open(self.path, "r") as f:
                return json.load(f)
        return {}

    def _save(self):
        with open(self.path, "w") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def get_user(self, user_id: int) -> dict:
        key = str(user_id)
        if key not in self.data:
            self.data[key] = {
                "requests_left": FREE_REQUESTS,
                "total_used": 0,
                "created_at": datetime.now().isoformat(),
                "last_request": 0,
                "is_premium": False,
            }
            self._save()
        return self.data[key]

    def use_request(self, user_id: int) -> bool:
        user = self.get_user(user_id)
        now = time.time()

        # Anti-spam cooldown
        if now - user["last_request"] < COOLDOWN_SECONDS:
            return False

        if user["requests_left"] > 0:
            user["requests_left"] -= 1
            user["total_used"] += 1
            user["last_request"] = now
            self._save()
            return True
        return False

    def add_requests(self, user_id: int, count: int):
        user = self.get_user(user_id)
        user["requests_left"] += count
        self._save()


db = UserDB()

# ─── OpenRouter API ──────────────────────────────────────────────────────────

async def ai_generate(system_prompt: str, user_prompt: str, use_premium: bool = False) -> str:
    """Generate text using OpenRouter API."""
    model = PREMIUM_MODEL if use_premium else FREE_MODEL

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://t.me/aicopywriterbot",
        "X-Title": "AI Copywriter Bot",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": MAX_OUTPUT_LENGTH,
        "temperature": 0.7,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


# ─── Human-like Typing Effect ────────────────────────────────────────────────

async def send_with_typing(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    text: str,
    max_chunk: int = 4096,
):
    """Send message with human-like typing effect (simulated)."""
    chat_id = update.effective_chat.id

    # Split into chunks if needed
    chunks = []
    for i in range(0, len(text), max_chunk):
        chunk = text[i : i + max_chunk]
        # Don't cut mid-word
        if i + max_chunk < len(text) and text[i + max_chunk] not in " \n.!?":
            last_space = chunk.rfind(" ")
            if last_space > 0:
                chunk = chunk[:last_space]
        chunks.append(chunk)

    # Fix last chunk
    if len(chunks) > 1:
        chunks[-1] = text[len("".join(chunks[:-1])) :]

    for chunk in chunks:
        # Show typing indicator
        await context.bot.send_chat_action(chat_id=chat_id, action="typing")

        # Random delay to simulate "thinking"
        await asyncio.sleep(random.uniform(0.5, 1.5))

        # Send the chunk
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"{random_emoji('done')} {chunk}",
            parse_mode=ParseMode.HTML,
        )


# ─── Handlers ────────────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    user = update.effective_user
    db.get_user(user.id)

    text = (
        f"{random_emoji()} <b>Привет, {user.first_name}!</b>\n\n"
        f"Я — AI Копирайтер. Помогаю писать продающие тексты за секунды.\n\n"
        f"📝 <b>Что умею:</b>\n"
        f"• Переписывать тексты лучше\n"
        f"• Писать блог-посты\n"
        f"• Создавать рекламные тексты\n"
        f"• Описания товаров\n"
        f"• Email-рассылки\n"
        f"• Посты для соцсетей\n\n"
        f"🎁 <b>Тебе дано {FREE_REQUESTS} бесплатных запросов!</b>\n\n"
        f"Введи текст или выбери команду ниже 👇"
    )

    keyboard = [
        [
            InlineKeyboardButton("📝 Переписать", callback_data="cmd_rewrite"),
            InlineKeyboardButton("📝 Блог", callback_data="cmd_blog"),
        ],
        [
            InlineKeyboardButton("📢 Реклама", callback_data="cmd_ad"),
            InlineKeyboardButton("📦 Товар", callback_data="cmd_product"),
        ],
        [
            InlineKeyboardButton("📧 Email", callback_data="cmd_email"),
            InlineKeyboardButton("📱 Соцсети", callback_data="cmd_social"),
        ],
        [InlineKeyboardButton("💳 Купить запросы", callback_data="buy_requests")],
    ]

    await update.message.reply_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command."""
    text = (
        f"{random_emoji()} <b>Команды AI Копирайтера:</b>\n\n"
        f"<b>Основные:</b>\n"
        f" /rewrite — Переписать текст лучше\n"
        f" /generate — Написать блог-пост\n"
        f" /blog — То же что /generate\n\n"
        f"<b>Реклама:</b>\n"
        f" /ad — Создать рекламный текст\n"
        f" /product — Описание товара\n\n"
        f"<b>Маркетинг:</b>\n"
        f" /email — Письмо для рассылки\n"
        f" /social — Пост для соцсетей\n\n"
        f"<b>Другое:</b>\n"
        f" /balance — Проверить баланс запросов\n"
        f" /help — Это сообщение\n\n"
        f"💡 <i>Просто отправь текст или нажми команду!</i>"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def cmd_balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /balance command."""
    user = db.get_user(update.effective_user.id)
    left = user["requests_left"]
    total = user["total_used"]

    if left > 5:
        emoji = "🟢"
    elif left > 0:
        emoji = "🟡"
    else:
        emoji = "🔴"

    text = (
        f"{emoji} <b>Баланс запросов:</b>\n\n"
        f"Осталось: <b>{left}</b>\n"
        f"Использовано: <b>{total}</b>\n\n"
    )

    if left == 0:
        text += (
            f"Запросы закончились! Купи пакет запросов через ⭐ Telegram Stars.\n"
            f"Нажми /buy или кнопку ниже 👇"
        )
    else:
        text += f"Пиши команду — я готов помочь! {random_emoji()}"

    keyboard = [[InlineKeyboardButton("💳 Купить запросы", callback_data="buy_requests")]]
    await update.message.reply_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_buy(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /buy — Telegram Stars payment."""
    title = f"{REQUESTS_PER_STARS} запросов AI копирайтера"
    description = (
        f"Получи {REQUESTS_PER_STARS} запросов для генерации текстов. "
        f"Блог-посты, реклама, описания — всё за секунды."
    )

    await update.message.reply_invoice(
        title=title,
        description=description,
        payload="copywriter_requests",
        currency="XTR",  # Telegram Stars
        prices=[LabeledPrice(label=f"{REQUESTS_PER_STARS} запросов", amount=PRICE_PER_REQUEST * REQUESTS_PER_STARS)],
    )


async def pre_checkout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle pre-checkout query."""
    await update.pre_checkout_query.answer(ok=True)


async def successful_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle successful payment."""
    user_id = update.effective_user.id
    db.add_requests(user_id, REQUESTS_PER_STARS)

    text = (
        f"{random_emoji('done')} <b>Оплата прошла успешно!</b>\n\n"
        f"Добавлено <b>{REQUESTS_PER_STARS} запросов</b> на твой счёт.\n"
        f"Пиши команды — работаем! 💪"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


# ─── Text Processing Commands ────────────────────────────────────────────────

async def _process_task(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    task_type: str,
    prompt_kwargs: dict,
):
    """Generic task processor with anti-spam and typing effect."""
    user_id = update.effective_user.id

    # Check balance
    if not db.use_request(user_id):
        user = db.get_user(user_id)
        if user["requests_left"] <= 0:
            await update.message.reply_text(
                f"🔴 <b>Закончились запросы!</b>\n\n"
                f"Купи ещё через /buy или кнопку ниже.",
                parse_mode=ParseMode.HTML,
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("💳 Купить запросы", callback_data="buy_requests")]
                ]),
            )
        else:
            await update.message.reply_text(
                f"⏳ Подожди немного... Слишком быстро! {random_emoji('waiting')}",
                parse_mode=ParseMode.HTML,
            )
        return

    # Show "thinking" message
    thinking_msg = await update.message.reply_text(
        f"{random_emoji('waiting')} Думаю над запросом...",
        parse_mode=ParseMode.HTML,
    )

    try:
        # Get prompts
        system_prompt, user_prompt = get_prompt(task_type, **prompt_kwargs)

        # Generate text
        result = await ai_generate(system_prompt, user_prompt)

        # Delete thinking message
        await thinking_msg.delete()

        # Send result with typing effect
        await send_with_typing(update, context, result)

    except Exception as e:
        await thinking_msg.edit_text(
            f"❌ Ошибка генерации: {str(e)}\n\n"
            f"Попробуй ещё раз или обратись к /help",
            parse_mode=ParseMode.HTML,
        )


# ─── Rewrite ─────────────────────────────────────────────────────────────────

async def cmd_rewrite(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /rewrite command."""
    if context.args:
        text = " ".join(context.args)
        await _process_task(update, context, "rewrite", {"text": text})
    else:
        # Set state to wait for text
        context.user_data["awaiting"] = "rewrite"
        await update.message.reply_text(
            f"{random_emoji()} Отправь текст, который хочешь переписать, и я сделаю его лучше!",
            parse_mode=ParseMode.HTML,
        )


# ─── Blog / Generate ─────────────────────────────────────────────────────────

async def cmd_blog(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /blog and /generate commands."""
    if context.args:
        topic = " ".join(context.args)
        await _process_task(
            update, context, "blog",
            {"topic": topic, "length": "500", "tone": "informal"}
        )
    else:
        context.user_data["awaiting"] = "blog"
        await update.message.reply_text(
            f"{random_emoji()} На какую тему написать блог-пост? Опиши тему 👇",
            parse_mode=ParseMode.HTML,
        )


async def cmd_generate(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Alias for /blog."""
    await cmd_blog(update, context)


# ─── Ads ─────────────────────────────────────────────────────────────────────

async def cmd_ad(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /ad command — show platform selection."""
    keyboard = [
        [
            InlineKeyboardButton("📘 Facebook", callback_data="ad_facebook"),
            InlineKeyboardButton("📸 Instagram", callback_data="ad_instagram"),
        ],
        [InlineKeyboardButton("🔍 Google Ads", callback_data="ad_google")],
    ]
    await update.message.reply_text(
        f"{random_emoji()} Выбери платформу для рекламы:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def callback_ad_platform(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle ad platform selection."""
    query = update.callback_query
    await query.answer()

    platform = query.data.replace("ad_", "")
    context.user_data["awaiting"] = f"ad_{platform}"

    platform_names = {
        "facebook": "Facebook",
        "instagram": "Instagram",
        "google": "Google Ads",
    }

    await query.edit_message_text(
        f"{random_emoji()} Отправь информацию для создания {platform_names[platform]} рекламы.\n\n"
        f"Формат:\n"
        f"<b>Продукт:</b> что продаём\n"
        f"<b>Аудитория:</b> кому\n"
        f"<b>Цель:</b> что должен сделать пользователь",
        parse_mode=ParseMode.HTML,
    )


# ─── Product Description ────────────────────────────────────────────────────

async def cmd_product(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /product command."""
    if context.args:
        product = " ".join(context.args)
        await _process_task(
            update, context, "product_description",
            {"product": product, "category": "универсальная", "features": "не указаны"}
        )
    else:
        context.user_data["awaiting"] = "product"
        await update.message.reply_text(
            f"{random_emoji()} Опиши товар, для которого нужно написать описание 👇",
            parse_mode=ParseMode.HTML,
        )


# ─── Email ───────────────────────────────────────────────────────────────────

async def cmd_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /email command."""
    if context.args:
        topic = " ".join(context.args)
        await _process_task(
            update, context, "email",
            {"email_type": "промо", "topic": topic, "goal": "продажа"}
        )
    else:
        context.user_data["awaiting"] = "email"
        await update.message.reply_text(
            f"{random_emoji()} Опиши тему email-рассылки и цель 👇",
            parse_mode=ParseMode.HTML,
        )


# ─── Social Media ───────────────────────────────────────────────────────────

async def cmd_social(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /social command."""
    keyboard = [
        [
            InlineKeyboardButton("Telegram", callback_data="social_telegram"),
            InlineKeyboardButton("VK", callback_data="social_vk"),
        ],
        [
            InlineKeyboardButton("Twitter/X", callback_data="social_twitter"),
            InlineKeyboardButton("LinkedIn", callback_data="social_linkedin"),
        ],
    ]
    await update.message.reply_text(
        f"{random_emoji()} Выбери платформу:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def callback_social_platform(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle social platform selection."""
    query = update.callback_query
    await query.answer()

    platform = query.data.replace("social_", "")
    context.user_data["awaiting"] = f"social_{platform}"

    await query.edit_message_text(
        f"{random_emoji()} Теперь напиши тему поста для {platform} 👇",
        parse_mode=ParseMode.HTML,
    )


# ─── Callback Button Handler ────────────────────────────────────────────────

async def callback_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle inline button callbacks."""
    query = update.callback_query
    await query.answer()

    data = query.data

    if data == "cmd_rewrite":
        context.user_data["awaiting"] = "rewrite"
        await query.edit_message_text(
            f"{random_emoji()} Отправь текст, который хочешь переписать:",
            parse_mode=ParseMode.HTML,
        )
    elif data == "cmd_blog":
        context.user_data["awaiting"] = "blog"
        await query.edit_message_text(
            f"{random_emoji()} На какую тему написать блог-пост?",
            parse_mode=ParseMode.HTML,
        )
    elif data == "cmd_ad":
        keyboard = [
            [
                InlineKeyboardButton("📘 Facebook", callback_data="ad_facebook"),
                InlineKeyboardButton("📸 Instagram", callback_data="ad_instagram"),
            ],
            [InlineKeyboardButton("🔍 Google Ads", callback_data="ad_google")],
        ]
        await query.edit_message_text(
            f"{random_emoji()} Выбери платформу:",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
    elif data == "cmd_product":
        context.user_data["awaiting"] = "product"
        await query.edit_message_text(
            f"{random_emoji()} Опиши товар для описания:",
            parse_mode=ParseMode.HTML,
        )
    elif data == "cmd_email":
        context.user_data["awaiting"] = "email"
        await query.edit_message_text(
            f"{random_emoji()} Опиши тему email-рассылки:",
            parse_mode=ParseMode.HTML,
        )
    elif data == "cmd_social":
        keyboard = [
            [
                InlineKeyboardButton("Telegram", callback_data="social_telegram"),
                InlineKeyboardButton("VK", callback_data="social_vk"),
            ],
            [
                InlineKeyboardButton("Twitter/X", callback_data="social_twitter"),
                InlineKeyboardButton("LinkedIn", callback_data="social_linkedin"),
            ],
        ]
        await query.edit_message_text(
            f"{random_emoji()} Выбери платформу:",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
    elif data == "buy_requests":
        title = f"{REQUESTS_PER_STARS} запросов AI копирайтера"
        description = f"Получи {REQUESTS_PER_STARS} запросов для генерации текстов."
        await context.bot.send_invoice(
            chat_id=query.message.chat_id,
            title=title,
            description=description,
            payload="copywriter_requests",
            currency="XTR",
            prices=[LabeledPrice(label=f"{REQUESTS_PER_STARS} запросов", amount=PRICE_PER_REQUEST * REQUESTS_PER_STARS)],
        )


# ─── Free-text Message Handler (state machine) ──────────────────────────────

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle free text input based on user state."""
    awaiting = context.user_data.get("awaiting")
    text = update.message.text[:MAX_INPUT_LENGTH]

    if not awaiting:
        # No state — treat as rewrite request
        await _process_task(update, context, "rewrite", {"text": text})
        return

    if awaiting == "rewrite":
        await _process_task(update, context, "rewrite", {"text": text})

    elif awaiting == "blog":
        await _process_task(
            update, context, "blog",
            {"topic": text, "length": "500", "tone": "informal"}
        )

    elif awaiting == "product":
        await _process_task(
            update, context, "product_description",
            {"product": text, "category": "универсальная", "features": "не указаны"}
        )

    elif awaiting == "email":
        await _process_task(
            update, context, "email",
            {"email_type": "промо", "topic": text, "goal": "продажа"}
        )

    elif awaiting.startswith("ad_"):
        platform = awaiting[3:]
        # Parse user input for product/audience/goal
        parts = text.split("\n")
        product = parts[0] if len(parts) > 0 else text
        audience = parts[1] if len(parts) > 1 else "широкая аудитория"
        goal = parts[2] if len(parts) > 2 else "продажа"

        prompt_key = f"ad_{platform}"
        await _process_task(
            update, context, prompt_key,
            {"product": product, "audience": audience, "goal": goal}
        )

    elif awaiting.startswith("social_"):
        platform = awaiting[7:]
        await _process_task(
            update, context, "social_media",
            {"platform": platform, "topic": text, "tone": "informal", "goal": "вовлечение"}
        )

    else:
        # Unknown state, treat as rewrite
        await _process_task(update, context, "rewrite", {"text": text})

    # Clear state
    context.user_data.pop("awaiting", None)


# ─── Error Handler ───────────────────────────────────────────────────────────

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Log errors."""
    print(f"[ERROR] Update {update} caused error: {context.error}")


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    """Start the bot."""
    print("🤖 AI Copywriter Bot starting...")

    app = Application.builder().token(BOT_TOKEN).build()

    # Command handlers
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("balance", cmd_balance))
    app.add_handler(CommandHandler("buy", cmd_buy))
    app.add_handler(CommandHandler("rewrite", cmd_rewrite))
    app.add_handler(CommandHandler("blog", cmd_blog))
    app.add_handler(CommandHandler("generate", cmd_generate))
    app.add_handler(CommandHandler("ad", cmd_ad))
    app.add_handler(CommandHandler("product", cmd_product))
    app.add_handler(CommandHandler("email", cmd_email))
    app.add_handler(CommandHandler("social", cmd_social))

    # Callback handlers
    app.add_handler(CallbackQueryHandler(callback_button, pattern="^(cmd_|buy_requests)"))
    app.add_handler(CallbackQueryHandler(callback_ad_platform, pattern="^ad_"))
    app.add_handler(CallbackQueryHandler(callback_social_platform, pattern="^social_"))

    # Payment handlers
    app.add_handler(PreCheckoutQueryHandler(pre_checkout))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment))

    # Free text handler (must be last)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    # Error handler
    app.add_error_handler(error_handler)

    print("✅ Bot is running! Press Ctrl+C to stop.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
