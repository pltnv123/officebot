#!/usr/bin/env python3
"""
AI Secretary Telegram Bot
=========================
Professional AI assistant for daily work tasks.

Commands:
    /start      — Welcome & quota info
    /help       — Show all commands
    /remind     — Set a reminder
    /schedule   — Add to calendar
    /email      — Draft an email
    /notes      — Meeting/call notes
    /quota      — Check remaining requests
"""

import asyncio
import json
import logging
import random
import re
import sys
import time
from datetime import datetime, timedelta

import aiohttp
from telegram import Update
from telegram.constants import ChatAction, ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from config import (
    BOT_TOKEN,
    OPENROUTER_API_KEY,
    OPENROUTER_API_URL,
    DEFAULT_MODEL,
    FALLBACK_MODELS,
    FREE_REQUESTS,
    TYPING_DELAY_MIN,
    TYPING_DELAY_MAX,
    RESPONSE_DELAY_MIN,
    RESPONSE_DELAY_MAX,
    MAX_TOKENS,
    REMINDER_CHECK_INTERVAL,
)
from prompts import get_prompt, SYSTEM_PROMPT
from database import (
    get_or_create_user,
    decrement_free_requests,
    get_user_quota,
    add_reminder,
    get_pending_reminders,
    mark_reminder_sent,
    get_user_reminders,
    add_note,
    get_user_notes,
    add_schedule_event,
    get_user_schedule,
)

# ─── Logging ───
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("ai-secretary")


# ─── OpenRouter API ───

async def call_openrouter(
    system_prompt: str,
    user_message: str,
    model: str = DEFAULT_MODEL,
    max_tokens: int = MAX_TOKENS,
) -> str:
    """Call OpenRouter API and return the assistant's response."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/ai-secretary-bot",
        "X-Title": "AI Secretary Bot",
    }

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            if resp.status != 200:
                error_text = await resp.text()
                logger.error(f"OpenRouter error {resp.status}: {error_text}")
                # Try fallback models
                for fallback in FALLBACK_MODELS:
                    if fallback != model:
                        payload["model"] = fallback
                        try:
                            async with session.post(
                                OPENROUTER_API_URL,
                                headers=headers,
                                json=payload,
                                timeout=aiohttp.ClientTimeout(total=30),
                            ) as resp2:
                                if resp2.status == 200:
                                    data2 = await resp2.json()
                                    return data2["choices"][0]["message"]["content"]
                        except Exception:
                            continue
                return "⚠️ Извините, AI сервис временно недоступен. Попробуйте позже."

            data = await resp.json()
            return data["choices"][0]["message"]["content"]


# ─── Human-like typing effect ───

async def human_typing(chat_id: int, context: ContextTypes.DEFAULT_TYPE, duration: float = None):
    """Show typing indicator with human-like delay."""
    if duration is None:
        duration = random.uniform(TYPING_DELAY_MIN, TYPING_DELAY_MAX)
    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)
    await asyncio.sleep(duration)


async def anti_ban_delay():
    """Random delay before responding to avoid rate limits."""
    delay = random.uniform(RESPONSE_DELAY_MIN, RESPONSE_DELAY_MAX)
    await asyncio.sleep(delay)


# ─── Command Handlers ───

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    user = update.effective_user
    db_user = get_or_create_user(user.id, user.username or "", user.first_name or "")

    await human_typing(update.effective_chat.id, context)
    await anti_ban_delay()

    welcome = (
        f"👋 Привет{', ' + user.first_name if user.first_name else ''}!\n\n"
        f"Я — твой AI Секретарь. Помогаю с:\n"
        f"📝 Составлением писем\n"
        f"⏰ Напоминаниями\n"
        f"📅 Расписанием\n"
        f"📋 Заметками с совещаний\n"
        f"📊 Отчётами и презентациями\n\n"
        f"🆓 У тебя **{db_user['free_requests']}** бесплатных запросов.\n"
        f"Просто напиши задачу или выбери команду!\n\n"
        f"Используй /help для списка команд."
    )
    await update.message.reply_text(welcome, parse_mode=ParseMode.MARKDOWN)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command."""
    await human_typing(update.effective_chat.id, context)

    help_text = (
        "🤖 **AI Секретарь — Команды**\n\n"
        "/remind ВРЕМЯ \"ТЕКСТ\" — Напоминание\n"
        "Пример: `/remind 15:00 Позвонить клиенту`\n\n"
        "/schedule \"ОПИСАНИЕ\" ВРЕМЯ — Запись в расписание\n"
        "Пример: `/schedule \"Встреча с командой\" 14:00`\n\n"
        "/email АДРЕС \"ТЕМА\" — Составить письмо\n"
        "Пример: `/email boss@company.com \"Отчёт за неделю\"`\n\n"
        "/notes \"ТЕМА\" — Заметки совещания\n"
        "Пример: `/notes \"Заседание совета\"`\n\n"
        "/reminders — Мои напоминания\n"
        "/schedule_list — Моё расписание\n"
        "/quota — Баланс запросов\n\n"
        "💡 Просто напиши сообщение — отвечу на любой вопрос!"
    )
    await update.message.reply_text(help_text, parse_mode=ParseMode.MARKDOWN)


async def cmd_quota(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /quota command."""
    user = update.effective_user
    quota = get_user_quota(user.id)

    await human_typing(update.effective_chat.id, context)

    text = (
        f"📊 **Статистика запросов**\n\n"
        f"🆓 Бесплатных осталось: **{quota['free_requests']}**\n"
        f"📈 Всего использовано: **{quota['total_requests']}**\n\n"
    )
    if quota["free_requests"] <= 0:
        text += "⚠️ Бесплатные запросы закончились. Пополните баланс для продолжения."
    elif quota["free_requests"] <= 3:
        text += "💡 Бесплатные запросы скоро закончатся!"

    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)


async def cmd_remind(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /remind command. Usage: /remind 15:00 "Task text" """
    if not context.args:
        await update.message.reply_text(
            "⏰ Использование: `/remind 15:00 \"Текст напоминания\"`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    await human_typing(update.effective_chat.id, context)

    # Parse time and text
    full_text = " ".join(context.args)

    # Extract time (HH:MM format)
    time_match = re.search(r"(\d{1,2}:\d{2})", full_text)
    if not time_match:
        # Try format like "15:00"
        time_match = re.search(r"(\d{1,2})", full_text)

    if not time_match:
        await update.message.reply_text("⚠️ Укажи время в формате: `/remind 15:00 \"Текст\"`", parse_mode=ParseMode.MARKDOWN)
        return

    time_str = time_match.group(1)
    # Ensure HH:MM format
    if ":" not in time_str:
        time_str = f"{time_str}:00"

    # Extract task text (in quotes)
    text_match = re.search(r'"([^"]+)"', full_text)
    if not text_match:
        text_match = re.search(r"'([^']+)'", full_text)

    task_text = text_match.group(1) if text_match else full_text.replace(time_str, "").strip()

    # Build remind_time
    now = datetime.now()
    try:
        hour, minute = map(int, time_str.split(":"))
        remind_dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if remind_dt < now:
            remind_dt += timedelta(days=1)
    except ValueError:
        await update.message.reply_text("⚠️ Неверный формат времени. Используй HH:MM", parse_mode=ParseMode.MARKDOWN)
        return

    # Save to DB
    user = update.effective_user
    reminder_id = add_reminder(user.id, task_text, remind_dt.isoformat())

    await anti_ban_delay()
    await update.message.reply_text(
        f"⏰ Напомню **{time_str}**: {task_text}\n🆔 ID: {reminder_id}",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_reminders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /reminders command."""
    user = update.effective_user
    reminders = get_user_reminders(user.id)

    await human_typing(update.effective_chat.id, context)

    if not reminders:
        await update.message.reply_text("📭 Нет активных напоминаний.")
        return

    text = "📋 **Твои напоминания:**\n\n"
    for r in reminders:
        dt = datetime.fromisoformat(r["remind_time"])
        text += f"⏰ {dt.strftime('%H:%M %d.%m')} — {r['reminder_text']}\n"

    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)


async def cmd_schedule(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /schedule command. Usage: /schedule "Event" 14:00 """
    if not context.args:
        await update.message.reply_text(
            "📅 Использование: `/schedule \"Описание события\" 14:00`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    await human_typing(update.effective_chat.id, context)

    full_text = " ".join(context.args)

    # Extract time
    time_match = re.search(r"(\d{1,2}:\d{2})", full_text)
    time_str = time_match.group(1) if time_match else "00:00"

    # Extract event text
    event_match = re.search(r'"([^"]+)"', full_text)
    event_text = event_match.group(1) if event_match else full_text.replace(time_str, "").strip()

    # Build event time
    now = datetime.now()
    try:
        hour, minute = map(int, time_str.split(":"))
        event_dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if event_dt < now:
            event_dt += timedelta(days=1)
    except ValueError:
        event_dt = now + timedelta(hours=1)

    user = update.effective_user
    event_id = add_schedule_event(user.id, event_text, event_dt.isoformat())

    await anti_ban_delay()
    await update.message.reply_text(
        f"📅 Добавлено в расписание!\n"
        f"📌 {event_text}\n"
        f"🕐 {event_dt.strftime('%H:%M %d.%m.%Y')}\n"
        f"🆔 ID: {event_id}",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_schedule_list(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /schedule_list command."""
    user = update.effective_user
    events = get_user_schedule(user.id)

    await human_typing(update.effective_chat.id, context)

    if not events:
        await update.message.reply_text("📭 Нет запланированных событий.")
        return

    text = "📅 **Расписание:**\n\n"
    for e in events:
        dt = datetime.fromisoformat(e["event_time"])
        text += f"🕐 {dt.strftime('%H:%M %d.%m')} — {e['event']}\n"

    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)


async def cmd_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /email command. Usage: /email recipient@company.com "Subject" """
    if not context.args:
        await update.message.reply_text(
            "📧 Использование: `/email recipient@company.com \"Тема письма\"`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    user = update.effective_user
    quota = get_user_quota(user.id)

    if quota["free_requests"] <= 0:
        await update.message.reply_text(
            "⚠️ Бесплатные запросы закончились. Пополните баланс."
        )
        return

    full_text = " ".join(context.args)

    # Extract email
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", full_text)
    email = email_match.group(0) if email_match else ""

    # Extract subject
    subject_match = re.search(r'"([^"]+)"', full_text)
    subject = subject_match.group(1) if subject_match else full_text.replace(email, "").strip()

    # Show typing
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
    # Simulate AI thinking with longer delay for email
    await asyncio.sleep(random.uniform(2.0, 4.0))

    system_prompt, user_prompt = get_prompt(
        "email",
        subject=subject or "Без темы",
        context=f"Получатель: {email}\nТема: {subject}\nЗапрос от пользователя (дополнительный контекст может быть позже)",
    )

    response = await call_openrouter(system_prompt, user_prompt)
    decrement_free_requests(user.id)

    await anti_ban_delay()

    remaining = quota["free_requests"] - 1
    await update.message.reply_text(
        f"📧 **Письмо для {email}:**\n\n{response}\n\n"
        f"🆓 Осталось запросов: {remaining}",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_notes(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /notes command. Usage: /notes "Meeting title" """
    if not context.args:
        await update.message.reply_text(
            "📋 Использование: `/notes \"Тема совещания\"`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    user = update.effective_user
    title = " ".join(context.args).strip('"').strip("'")

    note_id = add_note(user.id, title, raw_notes="", summary="")

    await human_typing(update.effective_chat.id, context)
    await update.message.reply_text(
        f"📋 **Заметка создана!**\n\n"
        f"📌 Тема: {title}\n"
        f"🆔 ID: {note_id}\n\n"
        f"💬 Пришли мне заметки с совещания — я сделаю краткое резюме.\n"
        f"Просто напиши текст заметок в этот чат.",
        parse_mode=ParseMode.MARKDOWN,
    )

    # Set context state for next message
    context.user_data["pending_note_id"] = note_id
    context.user_data["awaiting_note_content"] = True


async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle free-form text messages (AI conversation)."""
    user = update.effective_user
    text = update.message.text

    # Check if we're awaiting note content
    if context.user_data.get("awaiting_note_content"):
        note_id = context.user_data.get("pending_note_id")
        if note_id:
            # Process notes with AI
            await context.bot.send_chat_action(
                chat_id=update.effective_chat.id, action=ChatAction.TYPING
            )
            await asyncio.sleep(random.uniform(2.0, 4.0))

            system_prompt, user_prompt = get_prompt("notes", title="Заметки", notes=text)
            summary = await call_openrouter(system_prompt, user_prompt)

            # Save summary to DB
            from database import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE notes SET raw_notes = ?, summary = ? WHERE id = ?",
                (text, summary, note_id)
            )
            conn.commit()
            conn.close()

            await anti_ban_delay()
            await update.message.reply_text(
                f"📋 **Резюме совещания:**\n\n{summary}",
                parse_mode=ParseMode.MARKDOWN,
            )

            context.user_data.clear()
            return

    # Check quota
    quota = get_user_quota(user.id)
    if quota["free_requests"] <= 0:
        await update.message.reply_text(
            "⚠️ Бесплатные запросы закончились.\n"
            "Используйте /help для команд, которые не требуют AI."
        )
        return

    # General AI chat
    await context.bot.send_chat_action(
        chat_id=update.effective_chat.id, action=ChatAction.TYPING
    )
    await asyncio.sleep(random.uniform(1.5, 3.0))

    response = await call_openrouter(SYSTEM_PROMPT, text)
    decrement_free_requests(user.id)

    remaining = quota["free_requests"] - 1

    await anti_ban_delay()

    # Split long messages (Telegram limit ~4096 chars)
    if len(response) > 4000:
        for i in range(0, len(response), 4000):
            chunk = response[i : i + 4000]
            await update.message.reply_text(chunk)
            await asyncio.sleep(0.5)
    else:
        await update.message.reply_text(response)

    # Show remaining quota
    if remaining <= 3 and remaining >= 0:
        await update.message.reply_text(f"🆓 Осталось запросов: {remaining}")


# ─── Reminder Checker (background task) ───

async def check_reminders(context: ContextTypes.DEFAULT_TYPE):
    """Background job: check and send due reminders."""
    try:
        pending = get_pending_reminders()
        for reminder in pending:
            try:
                await context.bot.send_message(
                    chat_id=reminder["user_id"],
                    text=f"⏰ **Напоминание!**\n\n{reminder['reminder_text']}",
                    parse_mode=ParseMode.MARKDOWN,
                )
                mark_reminder_sent(reminder["id"])
                logger.info(f"Sent reminder {reminder['id']} to user {reminder['user_id']}")
            except Exception as e:
                logger.error(f"Failed to send reminder {reminder['id']}: {e}")
                mark_reminder_sent(reminder["id"])  # Mark sent to avoid spamming
    except Exception as e:
        logger.error(f"Reminder check error: {e}")


# ─── Error Handler ───

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Log errors."""
    logger.error(f"Update {update} caused error: {context.error}")


# ─── Main ───

def main():
    """Start the bot."""
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set!")
        sys.exit(1)

    if not OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY not set!")
        sys.exit(1)

    logger.info("Starting AI Secretary Bot...")

    app = Application.builder().token(BOT_TOKEN).build()

    # Command handlers
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("quota", cmd_quota))
    app.add_handler(CommandHandler("remind", cmd_remind))
    app.add_handler(CommandHandler("reminders", cmd_reminders))
    app.add_handler(CommandHandler("schedule", cmd_schedule))
    app.add_handler(CommandHandler("schedule_list", cmd_schedule_list))
    app.add_handler(CommandHandler("email", cmd_email))
    app.add_handler(CommandHandler("notes", cmd_notes))

    # Text message handler (free-form AI chat)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))

    # Error handler
    app.add_error_handler(error_handler)

    # Background job: check reminders every 30 seconds
    app.job_queue.run_repeating(
        check_reminders,
        interval=REMINDER_CHECK_INTERVAL,
        first=5,
    )

    logger.info("Bot started. Polling for updates...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
