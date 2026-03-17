#!/usr/bin/env python3
"""
OfficeBot — Unified AI Assistant for Telegram
================================================
Combines Copywriter + Secretary functionality with human-like behavior.

Copywriter commands:
    /rewrite   — Rewrite text better
    /blog      — Write a blog post
    /ad        — Create ad copy (Facebook/Instagram/Google)
    /product   — Product description
    /email     — Email for newsletter (copywriter mode)
    /social    — Social media post

Secretary commands:
    /remind    — Set a reminder
    /schedule  — Add to calendar
    /notes     — Meeting/call notes
    /email_draft — Draft a professional email

通用 commands:
    /start     — Welcome message
    /help      — Show all commands
    /balance   — Check remaining requests
    /buy       — Buy more requests (Telegram Stars)
"""

import asyncio
import logging
import random
import re
import sys
import time
from datetime import datetime, timedelta

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
    FALLBACK_MODELS,
    FREE_REQUESTS,
    PRICE_PER_REQUEST,
    REQUESTS_PER_STARS,
    COOLDOWN_SECONDS,
    MAX_INPUT_LENGTH,
    MAX_OUTPUT_TOKENS,
    REMINDER_CHECK_INTERVAL,
)
from prompts import get_prompt, random_emoji, COPYWRITER_SYSTEM, SECRETARY_SYSTEM
from database import (
    get_or_create_user,
    use_request,
    add_requests,
    get_user_quota,
    add_reminder,
    get_pending_reminders,
    mark_reminder_sent,
    get_user_reminders,
    add_note,
    update_note_summary,
    get_user_notes,
    add_schedule_event,
    get_user_schedule,
)
from human import (
    simulate_typing,
    pre_response_delay,
    send_human_message,
    is_active_hours,
    get_out_of_hours_message,
    is_private_chat,
    maybe_typo,
)

# ─── Logging ───────────────────────────────────────────────────────────────

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("officebot")

# ─── User last-request timestamps (anti-spam in-memory) ────────────────────

_last_request: dict[int, float] = {}


# ═══════════════════════════════════════════════════════════════════════════
# OpenRouter API
# ═══════════════════════════════════════════════════════════════════════════

async def ai_generate(system_prompt: str, user_prompt: str, use_premium: bool = False) -> str:
    """Call OpenRouter and return the assistant's response."""
    model = PREMIUM_MODEL if use_premium else FREE_MODEL

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://t.me/officebot_assistant",
        "X-Title": "OfficeBot Assistant",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": MAX_OUTPUT_TOKENS,
        "temperature": 0.7,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def ai_generate_with_fallback(system_prompt: str, user_prompt: str) -> str:
    """Try primary model, then fallbacks."""
    models_to_try = [FREE_MODEL] + [m for m in FALLBACK_MODELS if m != FREE_MODEL]

    for model in models_to_try:
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://t.me/officebot_assistant",
                "X-Title": "OfficeBot Assistant",
            }
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": MAX_OUTPUT_TOKENS,
                "temperature": 0.7,
            }
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"Model {model} failed: {e}")
            continue

    return "⚠️ Извини, AI сейчас перегружен. Попробуй через пару минут."


# ═══════════════════════════════════════════════════════════════════════════
# GUARDS
# ═══════════════════════════════════════════════════════════════════════════

def _guard(update: Update) -> bool:
    """
    Returns False if we should ignore this update.
    Checks: private chat only, active hours.
    """
    if not is_private_chat(update):
        return False
    return True


# ═══════════════════════════════════════════════════════════════════════════
# COMMAND HANDLERS
# ═══════════════════════════════════════════════════════════════════════════

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start."""
    if not _guard(update):
        return

    user = update.effective_user
    get_or_create_user(user.id, user.username or "", user.first_name or "")

    await simulate_typing(update.effective_chat.id, context)
    await pre_response_delay()

    name = user.first_name or "друг"
    quota = get_user_quota(user.id)

    text = (
        f"{random_emoji('greeting')} Привет, {name}!\n\n"
        f"Я — OfficeBot, твой AI-помощник. Делаю всё:\n\n"
        f"📝 <b>Копирайтинг:</b>\n"
        f"  /rewrite — переписать текст\n"
        f"  /blog — блог-пост\n"
        f"  /ad — рекламный текст\n"
        f"  /product — описание товара\n"
        f"  /email — письмо для рассылки\n"
        f"  /social — пост для соцсетей\n\n"
        f"📋 <b>Секретарь:</b>\n"
        f"  /remind — напоминание\n"
        f"  /schedule — расписание\n"
        f"  /notes — заметки совещания\n"
        f"  /email_draft — деловое письмо\n\n"
        f"🆓 Бесплатных запросов: <b>{quota['free_requests']}</b>\n\n"
        f"Просто напиши задачу или выбери команду 👇"
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
        [
            InlineKeyboardButton("⏰ Напоминание", callback_data="cmd_remind"),
            InlineKeyboardButton("📅 Расписание", callback_data="cmd_schedule"),
        ],
        [InlineKeyboardButton("💳 Купить запросы", callback_data="buy_requests")],
    ]

    await update.message.reply_text(
        text,
        parse_mode=ParseMode.HTML,
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help."""
    if not _guard(update):
        return

    await simulate_typing(update.effective_chat.id, context)

    text = (
        f"{random_emoji()} <b>Команды OfficeBot:</b>\n\n"
        f"<b>📝 Копирайтинг:</b>\n"
        f"  /rewrite — переписать текст лучше\n"
        f"  /blog [тема] — блог-пост\n"
        f"  /ad — реклама (Facebook/Instagram/Google)\n"
        f"  /product — описание товара\n"
        f"  /email — email для рассылки\n"
        f"  /social — пост для соцсетей\n\n"
        f"<b>📋 Секретарь:</b>\n"
        f"  /remind 15:00 \"задача\" — напоминание\n"
        f"  /schedule \"событие\" 14:00 — расписание\n"
        f"  /notes \"тема\" — заметки совещания\n"
        f"  /email_draft — деловое письмо\n\n"
        f"<b>⚙️ Другое:</b>\n"
        f"  /balance — баланс запросов\n"
        f"  /buy — купить запросы\n"
        f"  /help — эта справка\n\n"
        f"💡 Просто напиши текст или выбери команду!"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def cmd_balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /balance."""
    if not _guard(update):
        return

    await simulate_typing(update.effective_chat.id, context)

    quota = get_user_quota(update.effective_user.id)
    left = quota["free_requests"]
    total = quota["total_requests"]

    if left > 5:
        icon = "🟢"
    elif left > 0:
        icon = "🟡"
    else:
        icon = "🔴"

    text = (
        f"{icon} <b>Баланс запросов:</b>\n\n"
        f"Осталось: <b>{left}</b>\n"
        f"Использовано: <b>{total}</b>\n\n"
    )

    if left == 0:
        text += "Закончились! Купи ещё через /buy ⭐"
    else:
        text += f"Пиши команду — работаем! {random_emoji()}"

    keyboard = [[InlineKeyboardButton("💳 Купить запросы", callback_data="buy_requests")]]
    await update.message.reply_text(
        text, parse_mode=ParseMode.HTML,
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_buy(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /buy — Telegram Stars payment."""
    if not _guard(update):
        return

    title = f"{REQUESTS_PER_STARS} запросов OfficeBot"
    description = (
        f"{REQUESTS_PER_STARS} запросов для копирайтинга и секретаря. "
        f"Блоги, реклама, письма, заметки — всё за секунды."
    )

    await update.message.reply_invoice(
        title=title,
        description=description,
        payload="officebot_requests",
        currency="XTR",
        prices=[LabeledPrice(label=f"{REQUESTS_PER_STARS} запросов", amount=PRICE_PER_REQUEST * REQUESTS_PER_STARS)],
    )


async def pre_checkout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle pre-checkout."""
    await update.pre_checkout_query.answer(ok=True)


async def successful_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle successful payment."""
    if not _guard(update):
        return

    user_id = update.effective_user.id
    add_requests(user_id, REQUESTS_PER_STARS)

    text = (
        f"{random_emoji('done')} <b>Оплата прошла!</b>\n\n"
        f"Добавлено <b>{REQUESTS_PER_STARS} запросов</b>.\n"
        f"Пиши команды — работаем! 💪"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


# ═══════════════════════════════════════════════════════════════════════════
# TASK PROCESSOR (shared by all AI commands)
# ═══════════════════════════════════════════════════════════════════════════

async def _process_task(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    task_type: str,
    prompt_kwargs: dict,
):
    """Generic AI task processor with quota check, anti-spam, typing effect."""
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id

    # Anti-spam cooldown
    now = time.time()
    if user_id in _last_request and now - _last_request[user_id] < COOLDOWN_SECONDS:
        await send_human_message(
            update, context,
            "Подожди немного… Слишком быстро! 😅",
            prefix_category="waiting",
        )
        return

    # Check quota
    if not use_request(user_id):
        quota = get_user_quota(user_id)
        if quota["free_requests"] <= 0:
            keyboard = [[InlineKeyboardButton("💳 Купить запросы", callback_data="buy_requests")]]
            await update.message.reply_text(
                "🔴 Запросы закончились!\nКупи ещё через /buy.",
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
        return

    _last_request[user_id] = now

    # "Thinking" message
    thinking = await update.message.reply_text(
        f"{random_emoji('waiting')} Думаю…",
        parse_mode=ParseMode.HTML,
    )

    try:
        system_prompt, user_prompt = get_prompt(task_type, **prompt_kwargs)
        result = await ai_generate_with_fallback(system_prompt, user_prompt)

        # Delete thinking message
        await thinking.delete()

        # Send with human effect
        await send_human_message(update, context, result, prefix_category="done")

        # Show remaining quota if low
        quota = get_user_quota(user_id)
        if 0 < quota["free_requests"] <= 3:
            await context.bot.send_message(
                chat_id=chat_id,
                text=f"🆓 Осталось запросов: {quota['free_requests']}",
            )

    except Exception as e:
        logger.error(f"Task error: {e}")
        await thinking.edit_text(
            f"❌ Что-то пошло не так. Попробуй ещё раз.\n"
            f"<code>{str(e)[:200]}</code>",
            parse_mode=ParseMode.HTML,
        )


# ═══════════════════════════════════════════════════════════════════════════
# COPYWRITER COMMANDS
# ═══════════════════════════════════════════════════════════════════════════

async def cmd_rewrite(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /rewrite."""
    if not _guard(update):
        return
    if context.args:
        text = " ".join(context.args)
        await _process_task(update, context, "rewrite", {"text": text})
    else:
        context.user_data["awaiting"] = "rewrite"
        await update.message.reply_text(
            f"{random_emoji()} Отправь текст, который хочешь переписать:"
        )


async def cmd_blog(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /blog."""
    if not _guard(update):
        return
    if context.args:
        topic = " ".join(context.args)
        await _process_task(update, context, "blog", {"topic": topic, "length": "500", "tone": "informal"})
    else:
        context.user_data["awaiting"] = "blog"
        await update.message.reply_text(f"{random_emoji()} На какую тему написать блог-пост?")


async def cmd_ad(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /ad — show platform selection."""
    if not _guard(update):
        return
    keyboard = [
        [
            InlineKeyboardButton("📘 Facebook", callback_data="ad_facebook"),
            InlineKeyboardButton("📸 Instagram", callback_data="ad_instagram"),
        ],
        [InlineKeyboardButton("🔍 Google Ads", callback_data="ad_google")],
    ]
    await update.message.reply_text(
        f"{random_emoji()} Выбери платформу:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def cmd_product(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /product."""
    if not _guard(update):
        return
    if context.args:
        product = " ".join(context.args)
        await _process_task(
            update, context, "product_description",
            {"product": product, "category": "универсальная", "features": "не указаны"},
        )
    else:
        context.user_data["awaiting"] = "product"
        await update.message.reply_text(f"{random_emoji()} Опиши товар для описания:")


async def cmd_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /email (copywriter mode — newsletter)."""
    if not _guard(update):
        return
    if context.args:
        topic = " ".join(context.args)
        await _process_task(update, context, "email", {"email_type": "промо", "topic": topic, "goal": "продажа"})
    else:
        context.user_data["awaiting"] = "email"
        await update.message.reply_text(f"{random_emoji()} Опиши тему и цель email-рассылки:")


async def cmd_social(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /social — show platform selection."""
    if not _guard(update):
        return
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


# ═══════════════════════════════════════════════════════════════════════════
# SECRETARY COMMANDS
# ═══════════════════════════════════════════════════════════════════════════

async def cmd_remind(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /remind. Usage: /remind 15:00 "task text" """
    if not _guard(update):
        return

    if not context.args:
        await update.message.reply_text(
            "⏰ Использование: `/remind 15:00 \"Текст напоминания\"`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    await simulate_typing(update.effective_chat.id, context)

    full_text = " ".join(context.args)

    # Parse time
    time_match = re.search(r"(\d{1,2}:\d{2})", full_text)
    if not time_match:
        time_match = re.search(r"(\d{1,2})", full_text)

    if not time_match:
        await update.message.reply_text("⚠️ Укажи время: `/remind 15:00 \"Текст\"`", parse_mode=ParseMode.MARKDOWN)
        return

    time_str = time_match.group(1)
    if ":" not in time_str:
        time_str = f"{time_str}:00"

    # Parse task text
    text_match = re.search(r'"([^"]+)"', full_text)
    if not text_match:
        text_match = re.search(r"'([^']+)'", full_text)
    task_text = text_match.group(1) if text_match else full_text.replace(time_str, "").strip()

    # Build datetime
    now = datetime.now()
    try:
        hour, minute = map(int, time_str.split(":"))
        remind_dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if remind_dt < now:
            remind_dt += timedelta(days=1)
    except ValueError:
        await update.message.reply_text("⚠️ Неверный формат времени. Используй HH:MM", parse_mode=ParseMode.MARKDOWN)
        return

    user = update.effective_user
    rid = add_reminder(user.id, task_text, remind_dt.isoformat())

    await pre_response_delay()
    await update.message.reply_text(
        f"⏰ Напомню <b>{time_str}</b>: {task_text}\n🆔 #{rid}",
        parse_mode=ParseMode.HTML,
    )


async def cmd_reminders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /reminders."""
    if not _guard(update):
        return

    await simulate_typing(update.effective_chat.id, context)
    reminders = get_user_reminders(update.effective_user.id)

    if not reminders:
        await update.message.reply_text("📭 Нет активных напоминаний.")
        return

    text = "📋 <b>Твои напоминания:</b>\n\n"
    for r in reminders:
        dt = datetime.fromisoformat(r["remind_time"])
        text += f"⏰ {dt.strftime('%H:%M %d.%m')} — {r['reminder_text']}\n"

    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def cmd_schedule(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /schedule. Usage: /schedule "event" 14:00 """
    if not _guard(update):
        return

    if not context.args:
        await update.message.reply_text(
            "📅 Использование: `/schedule \"Описание\" 14:00`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    await simulate_typing(update.effective_chat.id, context)

    full_text = " ".join(context.args)

    time_match = re.search(r"(\d{1,2}:\d{2})", full_text)
    time_str = time_match.group(1) if time_match else "00:00"

    event_match = re.search(r'"([^"]+)"', full_text)
    event_text = event_match.group(1) if event_match else full_text.replace(time_str, "").strip()

    now = datetime.now()
    try:
        hour, minute = map(int, time_str.split(":"))
        event_dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if event_dt < now:
            event_dt += timedelta(days=1)
    except ValueError:
        event_dt = now + timedelta(hours=1)

    user = update.effective_user
    eid = add_schedule_event(user.id, event_text, event_dt.isoformat())

    await pre_response_delay()
    await update.message.reply_text(
        f"📅 Добавлено в расписание!\n"
        f"📌 {event_text}\n"
        f"🕐 {event_dt.strftime('%H:%M %d.%m.%Y')}\n"
        f"🆔 #{eid}",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_schedule_list(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /schedule_list."""
    if not _guard(update):
        return

    await simulate_typing(update.effective_chat.id, context)
    events = get_user_schedule(update.effective_user.id)

    if not events:
        await update.message.reply_text("📭 Нет запланированных событий.")
        return

    text = "📅 <b>Расписание:</b>\n\n"
    for e in events:
        dt = datetime.fromisoformat(e["event_time"])
        text += f"🕐 {dt.strftime('%H:%M %d.%m')} — {e['event']}\n"

    await update.message.reply_text(text, parse_mode=ParseMode.HTML)


async def cmd_notes(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /notes. Usage: /notes "meeting title" """
    if not _guard(update):
        return

    if not context.args:
        await update.message.reply_text(
            "📋 Использование: `/notes \"Тема совещания\"`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    await simulate_typing(update.effective_chat.id, context)

    title = " ".join(context.args).strip('"\'')
    user = update.effective_user
    nid = add_note(user.id, title)

    await update.message.reply_text(
        f"📋 <b>Заметка создана!</b>\n"
        f"📌 Тема: {title}\n"
        f"🆔 #{nid}\n\n"
        f"💬 Пришли заметки — я сделаю резюме.",
        parse_mode=ParseMode.HTML,
    )

    context.user_data["pending_note_id"] = nid
    context.user_data["awaiting_note_content"] = True


async def cmd_email_draft(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /email_draft (secretary mode — professional email)."""
    if not _guard(update):
        return

    if not context.args:
        await update.message.reply_text(
            "📧 Использование: `/email_draft recipient@company.com \"Тема\"`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    quota = get_user_quota(update.effective_user.id)
    if quota["free_requests"] <= 0:
        await update.message.reply_text("🔴 Запросы закончились! Купи ещё через /buy.")
        return

    full_text = " ".join(context.args)

    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", full_text)
    recipient = email_match.group(0) if email_match else "не указан"

    subject_match = re.search(r'"([^"]+)"', full_text)
    subject = subject_match.group(1) if subject_match else full_text.replace(recipient, "").strip()

    if not use_request(update.effective_user.id):
        await update.message.reply_text("⏳ Подожди немного…")
        return

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
    await asyncio.sleep(random.uniform(2.0, 4.0))

    system_prompt, user_prompt = get_prompt(
        "email_draft",
        recipient=recipient, subject=subject, context=full_text,
    )
    result = await ai_generate_with_fallback(system_prompt, user_prompt)

    await send_human_message(update, context, result)


# ═══════════════════════════════════════════════════════════════════════════
# CALLBACK HANDLERS (inline buttons)
# ═══════════════════════════════════════════════════════════════════════════

async def callback_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle inline button callbacks."""
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "buy_requests":
        await context.bot.send_invoice(
            chat_id=query.message.chat_id,
            title=f"{REQUESTS_PER_STARS} запросов OfficeBot",
            description=f"Получи {REQUESTS_PER_STARS} запросов для копирайтинга и секретаря.",
            payload="officebot_requests",
            currency="XTR",
            prices=[LabeledPrice(label=f"{REQUESTS_PER_STARS} запросов", amount=PRICE_PER_REQUEST * REQUESTS_PER_STARS)],
        )
        return

    # Set awaiting state
    state_map = {
        "cmd_rewrite": ("rewrite", "Отправь текст для переписывания:"),
        "cmd_blog": ("blog", "На какую тему написать блог-пост?"),
        "cmd_product": ("product", "Опиши товар для описания:"),
        "cmd_email": ("email", "Опиши тему email-рассылки:"),
        "cmd_remind": ("_skip", "⏰ Использование: `/remind 15:00 \"Текст\"`"),
        "cmd_schedule": ("_skip", "📅 Использование: `/schedule \"Событие\" 14:00`"),
    }

    if data in state_map:
        state, msg = state_map[data]
        if state != "_skip":
            context.user_data["awaiting"] = state
        await query.edit_message_text(f"{random_emoji()} {msg}")
        return

    # Ad platform selection
    if data.startswith("ad_"):
        platform = data[3:]
        context.user_data["awaiting"] = f"ad_{platform}"
        names = {"facebook": "Facebook", "instagram": "Instagram", "google": "Google Ads"}
        await query.edit_message_text(
            f"{random_emoji()} Отправь данные для {names.get(platform, platform)} рекламы.\n\n"
            f"Формат:\n<b>Продукт:</b> что продаём\n<b>Аудитория:</b> кому\n<b>Цель:</b> действие",
            parse_mode=ParseMode.HTML,
        )
        return

    # Social platform selection
    if data.startswith("social_"):
        platform = data[7:]
        context.user_data["awaiting"] = f"social_{platform}"
        await query.edit_message_text(
            f"{random_emoji()} Напиши тему поста для {platform}:"
        )
        return


# ═══════════════════════════════════════════════════════════════════════════
# FREE-TEXT HANDLER (state machine)
# ═══════════════════════════════════════════════════════════════════════════

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle free-form text based on user state."""
    if not _guard(update):
        return

    # Active hours check
    if not is_active_hours():
        await update.message.reply_text(get_out_of_hours_message())
        return

    # Check if awaiting note content
    if context.user_data.get("awaiting_note_content"):
        note_id = context.user_data.get("pending_note_id")
        text = update.message.text

        if note_id:
            await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
            await asyncio.sleep(random.uniform(2.0, 4.0))

            system_prompt, user_prompt = get_prompt("notes_summary", title="Заметки", notes=text)
            summary = await ai_generate_with_fallback(system_prompt, user_prompt)

            update_note_summary(note_id, text, summary)

            await send_human_message(update, context, f"📋 <b>Резюме совещания:</b>\n\n{summary}")
            context.user_data.clear()
            return

    # Check quota
    quota = get_user_quota(update.effective_user.id)
    if quota["free_requests"] <= 0:
        await update.message.reply_text(
            "🔴 Запросы закончились!\nКупи ещё через /buy или кнопку ниже.",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("💳 Купить запросы", callback_data="buy_requests")]
            ]),
        )
        return

    text = update.message.text[:MAX_INPUT_LENGTH]
    awaiting = context.user_data.get("awaiting")

    if not awaiting:
        # No state — treat as rewrite request
        await _process_task(update, context, "rewrite", {"text": text})
        return

    if awaiting == "rewrite":
        await _process_task(update, context, "rewrite", {"text": text})

    elif awaiting == "blog":
        await _process_task(update, context, "blog", {"topic": text, "length": "500", "tone": "informal"})

    elif awaiting == "product":
        await _process_task(
            update, context, "product_description",
            {"product": text, "category": "универсальная", "features": "не указаны"},
        )

    elif awaiting == "email":
        await _process_task(update, context, "email", {"email_type": "промо", "topic": text, "goal": "продажа"})

    elif awaiting.startswith("ad_"):
        platform = awaiting[3:]
        parts = text.split("\n")
        product = parts[0] if parts else text
        audience = parts[1] if len(parts) > 1 else "широкая аудитория"
        goal = parts[2] if len(parts) > 2 else "продажа"
        await _process_task(
            update, context, f"ad_{platform}",
            {"product": product, "audience": audience, "goal": goal},
        )

    elif awaiting.startswith("social_"):
        platform = awaiting[7:]
        await _process_task(
            update, context, "social_media",
            {"platform": platform, "topic": text, "tone": "informal", "goal": "вовлечение"},
        )

    else:
        # Unknown state — treat as general question
        if not use_request(update.effective_user.id):
            await update.message.reply_text("⏳ Подожди немного…")
            return

        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
        await asyncio.sleep(random.uniform(1.5, 3.0))

        result = await ai_generate_with_fallback(SECRETARY_SYSTEM, text)
        await send_human_message(update, context, result)

    # Clear state
    context.user_data.pop("awaiting", None)


# ═══════════════════════════════════════════════════════════════════════════
# BACKGROUND: REMINDER CHECKER
# ═══════════════════════════════════════════════════════════════════════════

async def check_reminders(context: ContextTypes.DEFAULT_TYPE):
    """Background job: check and send due reminders."""
    try:
        pending = get_pending_reminders()
        for r in pending:
            try:
                await context.bot.send_message(
                    chat_id=r["user_id"],
                    text=f"⏰ <b>Напоминание!</b>\n\n{r['reminder_text']}",
                    parse_mode=ParseMode.HTML,
                )
                mark_reminder_sent(r["id"])
                logger.info(f"Sent reminder #{r['id']} to {r['user_id']}")
            except Exception as e:
                logger.error(f"Failed to send reminder #{r['id']}: {e}")
                mark_reminder_sent(r["id"])
    except Exception as e:
        logger.error(f"Reminder check error: {e}")


# ═══════════════════════════════════════════════════════════════════════════
# ERROR HANDLER
# ═══════════════════════════════════════════════════════════════════════════

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Log errors."""
    logger.error(f"Update {update} caused error: {context.error}")


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Start OfficeBot."""
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN not set!")
        sys.exit(1)

    logger.info("🤖 Starting OfficeBot...")

    app = Application.builder().token(BOT_TOKEN).build()

    # ─── General commands ───
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("balance", cmd_balance))
    app.add_handler(CommandHandler("buy", cmd_buy))

    # ─── Copywriter commands ───
    app.add_handler(CommandHandler("rewrite", cmd_rewrite))
    app.add_handler(CommandHandler("blog", cmd_blog))
    app.add_handler(CommandHandler("generate", cmd_blog))  # alias
    app.add_handler(CommandHandler("ad", cmd_ad))
    app.add_handler(CommandHandler("product", cmd_product))
    app.add_handler(CommandHandler("email", cmd_email))
    app.add_handler(CommandHandler("social", cmd_social))

    # ─── Secretary commands ───
    app.add_handler(CommandHandler("remind", cmd_remind))
    app.add_handler(CommandHandler("reminders", cmd_reminders))
    app.add_handler(CommandHandler("schedule", cmd_schedule))
    app.add_handler(CommandHandler("schedule_list", cmd_schedule_list))
    app.add_handler(CommandHandler("notes", cmd_notes))
    app.add_handler(CommandHandler("email_draft", cmd_email_draft))

    # ─── Callback handlers ───
    app.add_handler(CallbackQueryHandler(callback_button))

    # ─── Payment handlers ───
    app.add_handler(PreCheckoutQueryHandler(pre_checkout))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment))

    # ─── Free-text handler (must be last) ───
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    # ─── Error handler ───
    app.add_error_handler(error_handler)

    # ─── Background jobs ───
    # JobQueue disabled for simplicity

    logger.info("✅ OfficeBot is running! Press Ctrl+C to stop.")
    app.run_polling(drop_pending_updates=True, allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
