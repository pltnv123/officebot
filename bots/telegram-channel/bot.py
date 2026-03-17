#!/usr/bin/env python3
"""
OfficeBot Channel Manager — Telegram бот для ведения канала
Публикует посты, отвечает на комментарии, делает опросы
"""

import asyncio
import logging
import sqlite3
import random
from datetime import datetime, timezone, timedelta
from typing import Optional

from telegram import Update, Poll
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    PollAnswerHandler,
    ContextTypes,
    filters,
)
from telegram.constants import ParseMode

from config import (
    BOT_TOKEN,
    CHANNEL_ID,
    POST_SCHEDULE,
    REPLY_CHECK_INTERVAL,
    MAX_REPLIES_PER_HOUR,
    REPLY_PROBABILITY,
    DB_PATH,
    LOG_PATH,
    ACTIVE_HOUR_START,
    ACTIVE_HOUR_END,
)
from generator import ContentGenerator, get_generator
from content_plan import get_post_prompt

# ─── Logging ───
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
    handlers=[
        logging.FileHandler(LOG_PATH),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class ChannelBot:
    """Telegram Channel Bot — ведёт канал как живой человек"""
    
    def __init__(self):
        self.generator: Optional[ContentGenerator] = None
        self.app: Optional[Application] = None
        self.db = sqlite3.connect(DB_PATH)
        self._init_db()
        self.last_reply_count = 0
        self.last_reply_reset = datetime.now(timezone.utc)
    
    def _init_db(self):
        """Инициализация базы данных"""
        cursor = self.db.cursor()
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER UNIQUE,
                post_type TEXT,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                engagement_score INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER,
                user_id INTEGER,
                username TEXT,
                comment_text TEXT,
                replied BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS stats (
                date TEXT PRIMARY KEY,
                posts_count INTEGER DEFAULT 0,
                replies_count INTEGER DEFAULT 0,
                poll_votes INTEGER DEFAULT 0
            );
        """)
        self.db.commit()
    
    def _is_active_hour(self) -> bool:
        """Проверка активных часов (UTC)"""
        now = datetime.now(timezone.utc)
        return ACTIVE_HOUR_START <= now.hour < ACTIVE_HOUR_END
    
    def _can_reply(self) -> bool:
        """Проверка лимита ответов"""
        now = datetime.now(timezone.utc)
        
        # Сброс счётчика каждый час
        if (now - self.last_reply_reset).total_seconds() > 3600:
            self.last_reply_count = 0
            self.last_reply_reset = now
        
        return self.last_reply_count < MAX_REPLIES_PER_HOUR
    
    def _get_scheduled_post_type(self) -> Optional[str]:
        """Определить тип поста по расписанию"""
        now = datetime.now(timezone.utc)
        current_time = (now.hour, now.minute)
        
        for name, schedule in POST_SCHEDULE.items():
            sched_time = (schedule["hour"], schedule["minute"])
            # Окно ±15 минут
            if abs(current_time[0] - sched_time[0]) == 0:
                if abs(current_time[1] - sched_time[1]) <= 15:
                    return schedule["type"]
        
        return None
    
    async def publish_post(
        self,
        context: ContextTypes.DEFAULT_TYPE,
        post_type: str,
    ) -> Optional[int]:
        """Опубликовать пост в канал"""
        
        logger.info(f"Генерация поста типа: {post_type}")
        
        # Генерируем контент
        day_of_week = datetime.now(timezone.utc).weekday()
        content = await self.generator.generate_post(post_type, day_of_week)
        
        if not content:
            logger.error("Не удалось сгенерировать пост")
            return None
        
        try:
            # Отправляем пост
            message = await context.bot.send_message(
                chat_id=CHANNEL_ID,
                text=content,
                parse_mode=None,  # Без markdown для естественности
            )
            
            # Сохраняем в БД
            cursor = self.db.cursor()
            cursor.execute(
                "INSERT INTO posts (message_id, post_type, content) VALUES (?, ?, ?)",
                (message.message_id, post_type, content),
            )
            self.db.commit()
            
            logger.info(f"Пост опубликован: ID={message.message_id}")
            return message.message_id
            
        except Exception as e:
            logger.error(f"Ошибка публикации: {e}")
            return None
    
    async def publish_poll(
        self,
        context: ContextTypes.DEFAULT_TYPE,
        question: Optional[str] = None,
    ) -> Optional[int]:
        """Опубликовать опрос в канал"""
        
        # Генерируем вопрос если не указан
        if not question:
            questions = [
                "Какой инструмент AI вы используете чаще всего?",
                "Сколько времени в день тратите на рутину?",
                "Попробовали бы AI-ассистента для работы?",
                "Как думаете, AI заменит офисных работников?",
                "Какой навык хотите прокачать с помощью AI?",
                "Используете ли AI в личных целях?",
                "Сколько готовы платить за AI-помощника в месяц?",
            ]
            question = random.choice(questions)
        
        # Генерируем варианты через AI
        options = await self.generator.generate_poll_options(question)
        
        if not options or len(options) < 2:
            # Fallback варианты
            options = ["Да ✅", "Нет ❌", "Иногда 🤔", "Не пробовал 🤷"]
        
        try:
            message = await context.bot.send_poll(
                chat_id=CHANNEL_ID,
                question=question,
                options=options[:4],
                is_anonymous=True,
            )
            
            logger.info(f"Опрос опубликован: {message.message_id}")
            return message.message_id
            
        except Exception as e:
            logger.error(f"Ошибка создания опроса: {e}")
            return None
    
    async def handle_new_post(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Обработка новых сообщений в канале (для отслеживания)"""
        
        message = update.effective_message
        if not message or not message.chat:
            return
        
        # Сохраняем пост из канала
        cursor = self.db.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO posts (message_id, post_type, content) VALUES (?, ?, ?)",
            (message.message_id, "channel", message.text or ""),
        )
        self.db.commit()
    
    async def handle_comment(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Обработка комментариев к постам канала"""
        
        message = update.effective_message
        if not message or not message.text:
            return
        
        # Проверяем что это комментарий к посту канала
        if not message.reply_to_message:
            return
        
        # Проверяем активные часы
        if not self._is_active_hour():
            return
        
        # Проверяем лимит ответов
        if not self._can_reply():
            return
        
        # Случайный шанс ответа (чтобы не отвечать на каждый комментарий)
        if random.random() > REPLY_PROBABILITY:
            return
        
        # Получаем контекст поста
        original_post = message.reply_to_message.text or ""
        
        # Сохраняем комментарий
        user = message.from_user
        cursor = self.db.cursor()
        cursor.execute(
            """INSERT INTO comments 
               (message_id, user_id, username, comment_text) 
               VALUES (?, ?, ?, ?)""",
            (
                message.message_id,
                user.id if user else 0,
                user.username if user else "unknown",
                message.text,
            ),
        )
        self.db.commit()
        
        # Генерируем ответ
        reply_text = await self.generator.generate_reply(
            comment=message.text,
            post_context=original_post[:500],
        )
        
        if reply_text:
            try:
                await message.reply_text(reply_text)
                self.last_reply_count += 1
                
                # Отмечаем как отвеченный
                cursor.execute(
                    "UPDATE comments SET replied = TRUE WHERE message_id = ?",
                    (message.message_id,),
                )
                self.db.commit()
                
                logger.info(f"Ответ на комментарий: {message.message_id}")
                
            except Exception as e:
                logger.error(f"Ошибка ответа: {e}")
    
    async def handle_poll_answer(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Обработка ответов на опрос"""
        
        poll_answer = update.poll_answer
        if poll_answer:
            logger.info(f"Голос в опросе от пользователя {poll_answer.user.id}")
    
    # ─── Команды (для управления ботом в ЛС) ───
    
    async def cmd_start(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Команда /start"""
        await update.message.reply_text(
            "👋 Привет! Я OfficeBot Channel Manager.\n\n"
            "Команды:\n"
            "/post [тип] — опубликовать пост\n"
            "/poll — создать опрос\n"
            "/status — статистика\n"
            "/schedule — показать расписание\n"
        )
    
    async def cmd_post(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Ручная публикация поста"""
        
        post_type = "greeting"
        if context.args:
            arg = context.args[0].lower()
            type_map = {
                "morning": "greeting",
                "greeting": "greeting",
                "case": "case_study",
                "case_study": "case_study",
                "tutorial": "tutorial",
                "interactive": "interactive",
                "poll": "interactive",
                "summary": "summary",
            }
            post_type = type_map.get(arg, "greeting")
        
        await update.message.reply_text(f"⏳ Генерирую пост ({post_type})...")
        
        message_id = await self.publish_post(context, post_type)
        
        if message_id:
            await update.message.reply_text(f"✅ Опубликовано! Message ID: {message_id}")
        else:
            await update.message.reply_text("❌ Ошибка публикации")
    
    async def cmd_poll(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Создание опроса"""
        
        await update.message.reply_text("⏳ Создаю опрос...")
        
        question = None
        if context.args:
            question = " ".join(context.args)
        
        message_id = await self.publish_poll(context, question)
        
        if message_id:
            await update.message.reply_text(f"✅ Опрос создан! Message ID: {message_id}")
        else:
            await update.message.reply_text("❌ Ошибка создания опроса")
    
    async def cmd_status(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Статистика канала"""
        
        cursor = self.db.cursor()
        
        # Количество постов
        cursor.execute("SELECT COUNT(*) FROM posts")
        posts_count = cursor.fetchone()[0]
        
        # Количество комментариев
        cursor.execute("SELECT COUNT(*) FROM comments")
        comments_count = cursor.fetchone()[0]
        
        # Отвеченные комментарии
        cursor.execute("SELECT COUNT(*) FROM comments WHERE replied = TRUE")
        replied_count = cursor.fetchone()[0]
        
        # Последние посты
        cursor.execute(
            "SELECT post_type, created_at FROM posts ORDER BY id DESC LIMIT 5"
        )
        recent_posts = cursor.fetchall()
        
        recent_text = "\n".join(
            f"  • {ptype} — {date}" for ptype, date in recent_posts
        ) or "  Нет постов"
        
        status = (
            f"📊 Статистика канала\n\n"
            f"📝 Постов: {posts_count}\n"
            f"💬 Комментариев: {comments_count}\n"
            f"↩️ Отвечено: {replied_count}\n\n"
            f"🕐 Последние посты:\n{recent_text}"
        )
        
        await update.message.reply_text(status)
    
    async def cmd_schedule(
        self,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Показать расписание"""
        
        schedule_text = (
            "📅 Расписание постов (МСК):\n\n"
            "09:00 — Доброе утро + совет по AI\n"
            "12:00 — Кейс/история успеха\n"
            "15:00 — Туториал/инструкция\n"
            "18:00 — Интерактив (опрос/викторина)\n"
            "21:00 — Итоги дня\n"
        )
        
        await update.message.reply_text(schedule_text)
    
    async def scheduled_post(
        self,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Запланированная публикация поста"""
        
        post_type = self._get_scheduled_post_type()
        
        if post_type and self._is_active_hour():
            logger.info(f"Запланированная публикация: {post_type}")
            await self.publish_post(context, post_type)
    
    async def auto_poll_poster(
        self,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Автоматический постинг опросов (вечером)"""
        
        now = datetime.now(timezone.utc)
        # Опросы только в 18:00 MSK (15:00 UTC)
        if now.hour == 15 and self._is_active_hour():
            await self.publish_poll(context)
    
    async def post_summary(
        self,
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Итоги дня (вечерний пост)"""
        
        now = datetime.now(timezone.utc)
        # Итоги только в 21:00 MSK (18:00 UTC)
        if now.hour == 18 and self._is_active_hour():
            await self.publish_post(context, "summary")
    
    async def error_handler(
        self,
        update: Optional[Update],
        context: ContextTypes.DEFAULT_TYPE,
    ):
        """Обработка ошибок"""
        logger.error(f"Ошибка: {context.error}")
    
    def run(self):
        """Запуск бота"""
        
        logger.info("Запуск OfficeBot Channel Manager...")
        
        # Создаём Application
        self.app = Application.builder().token(BOT_TOKEN).build()
        
        # Инициализируем генератор
        self.generator = get_generator()
        
        # Команды
        self.app.add_handler(CommandHandler("start", self.cmd_start))
        self.app.add_handler(CommandHandler("post", self.cmd_post))
        self.app.add_handler(CommandHandler("poll", self.cmd_poll))
        self.app.add_handler(CommandHandler("status", self.cmd_status))
        self.app.add_handler(CommandHandler("schedule", self.cmd_schedule))
        
        # Хендлеры сообщений
        # Комментарии к постам (сообщения в канале с reply)
        self.app.add_handler(
            MessageHandler(
                filters.TEXT & filters.ChatType.CHANNEL,
                self.handle_new_post,
            )
        )
        
        # Хендлер для комментариев
        self.app.add_handler(
            MessageHandler(
                filters.TEXT & filters.ChatType.SUPERGROUP,
                self.handle_comment,
            )
        )
        
        # Ответы на опросы
        self.app.add_handler(PollAnswerHandler(self.handle_poll_answer))
        
        # Ошибки
        self.app.add_error_handler(self.error_handler)
        
        # Планировщик — проверка расписания каждую минуту
        job_queue = self.app.job_queue
        
        if job_queue:
            # Проверка расписания каждую минуту
            job_queue.run_repeating(
                self.scheduled_post,
                interval=60,
                first=10,
            )
            
            # Итоги дня
            job_queue.run_repeating(
                self.post_summary,
                interval=60,
                first=10,
            )
            
            logger.info("Планировщик запущен")
        
        # Запуск polling
        logger.info("Бот запущен и слушает сообщения...")
        self.app.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True,
        )


# ─── Entry Point ───
def main():
    bot = ChannelBot()
    bot.run()


if __name__ == "__main__":
    main()
