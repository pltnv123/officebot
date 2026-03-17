#!/usr/bin/env python3
"""
OfficeBot Twitter Agent
Human-like Twitter бот для продвижения OfficeBot

Запуск:
    python bot.py              # Основной цикл
    python bot.py --once       # Один пост и выход
    python bot.py --stats      # Показать статистику
    python bot.py --test       # Тестовый запуск (без реальных твитов)
"""

import json
import logging
import os
import random
import signal
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

try:
    import tweepy
except ImportError:
    print("Установи tweepy: pip install tweepy")
    sys.exit(1)

from config import TWITTER_CONFIG, BOT_SETTINGS, ENGAGEMENT_KEYWORDS
from human import Humanizer, BehaviorPattern
from content_generator import ContentGenerator

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(BOT_SETTINGS.get("log_file", "bot.log"), encoding='utf-8'),
    ]
)
logger = logging.getLogger(__name__)


class Stats:
    """Отслеживание статистики бота"""

    def __init__(self, filepath: str = "stats.json"):
        self.filepath = Path(filepath)
        self.data = self._load()

    def _load(self) -> dict:
        if self.filepath.exists():
            try:
                with open(self.filepath) as f:
                    return json.load(f)
            except json.JSONDecodeError:
                pass

        return {
            "today": datetime.now().strftime("%Y-%m-%d"),
            "posts": 0,
            "likes": 0,
            "retweets": 0,
            "replies": 0,
            "total_posts": 0,
            "total_likes": 0,
            "total_retweets": 0,
            "total_replies": 0,
            "started_at": datetime.now().isoformat(),
            "last_post": None,
            "last_like": None,
            "last_retweet": None,
        }

    def _reset_daily(self):
        today = datetime.now().strftime("%Y-%m-%d")
        if self.data.get("today") != today:
            self.data["today"] = today
            self.data["posts"] = 0
            self.data["likes"] = 0
            self.data["retweets"] = 0
            self.data["replies"] = 0

    def save(self):
        self._reset_daily()
        with open(self.filepath, 'w') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def can_post(self) -> bool:
        self._reset_daily()
        return self.data["posts"] < BOT_SETTINGS["max_posts_per_day"]

    def can_like(self) -> bool:
        self._reset_daily()
        return self.data["likes"] < BOT_SETTINGS["max_likes_per_day"]

    def can_retweet(self) -> bool:
        self._reset_daily()
        return self.data["retweets"] < BOT_SETTINGS["max_retweets_per_day"]

    def can_reply(self) -> bool:
        self._reset_daily()
        return self.data["replies"] < BOT_SETTINGS["max_replies_per_day"]

    def record_post(self):
        self.data["posts"] += 1
        self.data["total_posts"] += 1
        self.data["last_post"] = datetime.now().isoformat()
        self.save()

    def record_like(self):
        self.data["likes"] += 1
        self.data["total_likes"] += 1
        self.data["last_like"] = datetime.now().isoformat()
        self.save()

    def record_retweet(self):
        self.data["retweets"] += 1
        self.data["total_retweets"] += 1
        self.data["last_retweet"] = datetime.now().isoformat()
        self.save()

    def record_reply(self):
        self.data["replies"] += 1
        self.data["total_replies"] += 1
        self.save()

    def summary(self) -> str:
        today = datetime.now().strftime("%Y-%m-%d")
        return f"""📊 Статистика бота
📅 Сегодня ({today}):
   Посты: {self.data['posts']}/{BOT_SETTINGS['max_posts_per_day']}
   Лайки: {self.data['likes']}/{BOT_SETTINGS['max_likes_per_day']}
   Ретвиты: {self.data['retweets']}/{BOT_SETTINGS['max_retweets_per_day']}
   Ответы: {self.data['replies']}/{BOT_SETTINGS['max_replies_per_day']}

📈 Всего за всё время:
   Посты: {self.data['total_posts']}
   Лайки: {self.data['total_likes']}
   Ретвиты: {self.data['total_retweets']}
   Ответы: {self.data['total_replies']}

🕐 Запущен: {self.data.get('started_at', 'N/A')}
📝 Последний пост: {self.data.get('last_post', 'N/A')}"""


class TwitterBot:
    """Основной класс Twitter бота"""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.running = True
        self.humanizer = Humanizer(typo_chance=BOT_SETTINGS["typo_chance"])
        self.content_gen = ContentGenerator()
        self.stats = Stats()

        # Twitter API client
        self.client = None
        self.api_v1 = None  # Для了一些 endpoints которые работают только в v1.1

        if not dry_run:
            self._init_twitter()

        # Регистрируем обработчик сигналов для graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _init_twitter(self):
        """Инициализация Twitter API"""
        try:
            # Twitter API v2 client
            self.client = tweepy.Client(
                bearer_token=TWITTER_CONFIG["bearer_token"],
                consumer_key=TWITTER_CONFIG["api_key"],
                consumer_secret=TWITTER_CONFIG["api_secret"],
                access_token=TWITTER_CONFIG["access_token"],
                access_token_secret=TWITTER_CONFIG["access_token_secret"],
                wait_on_rate_limit=True,
            )

            # Twitter API v1.1 (для media upload, search, etc.)
            auth = tweepy.OAuth1UserHandler(
                TWITTER_CONFIG["api_key"],
                TWITTER_CONFIG["api_secret"],
                TWITTER_CONFIG["access_token"],
                TWITTER_CONFIG["access_token_secret"],
            )
            self.api_v1 = tweepy.API(auth, wait_on_rate_limit=True)

            # Проверяем авторизацию
            me = self.client.get_me()
            if me and me.data:
                logger.info(f"Авторизован как @{me.data.username}")
            else:
                logger.warning("Не удалось получить данные аккаунта")

        except Exception as e:
            logger.error(f"Ошибка инициализации Twitter API: {e}")
            logger.info("Запускаем в dry-run режиме")
            self.dry_run = True

    def _signal_handler(self, signum, frame):
        """Graceful shutdown"""
        logger.info("Получен сигнал остановки...")
        self.running = False

    def post_tweet(self, text: Optional[str] = None) -> bool:
        """Публикация твита"""
        if not self.stats.can_post():
            logger.info("Достигнут дневной лимит постов")
            return False

        if text is None:
            text = self.content_gen.generate_post()

        if not text:
            logger.warning("Не удалось сгенерировать пост")
            return False

        if len(text) > 280:
            text = text[:277] + "..."

        logger.info(f"Публикация: {text[:60]}...")

        if self.dry_run:
            logger.info("[DRY RUN] Пост не опубликован")
            self.stats.record_post()
            return True

        try:
            response = self.client.create_tweet(text=text)
            if response and response.data:
                tweet_id = response.data['id']
                logger.info(f"✅ Опубликовано! ID: {tweet_id}")
                self.stats.record_post()
                return True
            else:
                logger.error("Не удалось опубликовать пост")
                return False

        except tweepy.TweepyException as e:
            logger.error(f"Ошибка публикации: {e}")
            return False

    def like_tweet(self, tweet_id: str) -> bool:
        """Лайк твита"""
        if not self.stats.can_like():
            return False

        if self.dry_run:
            logger.info(f"[DRY RUN] Лайк: {tweet_id}")
            self.stats.record_like()
            return True

        try:
            self.client.like(tweet_ids=[tweet_id])
            logger.info(f"❤️ Лайк: {tweet_id}")
            self.stats.record_like()
            return True
        except tweepy.TweepyException as e:
            logger.error(f"Ошибка лайка: {e}")
            return False

    def retweet(self, tweet_id: str) -> bool:
        """Ретвит"""
        if not self.stats.can_retweet():
            return False

        if self.dry_run:
            logger.info(f"[DRY RUN] Ретвит: {tweet_id}")
            self.stats.record_retweet()
            return True

        try:
            self.client.retweet(tweet_id=tweet_id)
            logger.info(f"🔄 Ретвит: {tweet_id}")
            self.stats.record_retweet()
            return True
        except tweepy.TweepyException as e:
            logger.error(f"Ошибка ретвита: {e}")
            return False

    def reply_to_tweet(self, tweet_id: str, original_text: str) -> bool:
        """Ответ на твит"""
        if not self.stats.can_reply():
            return False

        reply_text = self.content_gen.generate_reply(original_text)

        if not reply_text:
            return False

        if self.dry_run:
            logger.info(f"[DRY RUN] Ответ на {tweet_id}: {reply_text[:50]}...")
            self.stats.record_reply()
            return True

        try:
            response = self.client.create_tweet(
                text=reply_text,
                in_reply_to_tweet_id=tweet_id
            )
            if response:
                logger.info(f"💬 Ответ на {tweet_id}")
                self.stats.record_reply()
                return True
        except tweepy.TweepyException as e:
            logger.error(f"Ошибка ответа: {e}")

        return False

    def search_and_engage(self, keyword: str, action: str = "like") -> int:
        """Поиск твитов и взаимодействие"""
        if self.dry_run:
            logger.info(f"[DRY RUN] Поиск: '{keyword}' для {action}")
            return 0

        count = 0
        try:
            # Поиск через v2 API
            tweets = self.client.search_recent_tweets(
                query=f"{keyword} -is:retweet lang:ru",
                max_results=10,
                tweet_fields=["author_id", "created_at", "public_metrics"]
            )

            if tweets and tweets.data:
                for tweet in tweets.data:
                    # Пропускаем свои твиты
                    me = self.client.get_me()
                    if me and tweet.author_id == me.data.id:
                        continue

                    if action == "like" and self.like_tweet(tweet.id):
                        count += 1
                    elif action == "retweet" and self.retweet(tweet.id):
                        count += 1

                    # Пауза между действиями
                    time.sleep(self.humanizer.get_random_delay(5, 15))

        except tweepy.TweepyException as e:
            logger.error(f"Ошибка поиска: {e}")

        return count

    def check_mentions_and_reply(self):
        """Проверка упоминаний и ответы"""
        if not self.stats.can_reply():
            return

        if self.dry_run:
            logger.info("[DRY RUN] Проверка упоминаний")
            return

        try:
            me = self.client.get_me()
            if not me:
                return

            # Получаем упоминания
            mentions = self.client.get_users_mentions(
                id=me.data.id,
                max_results=5,
                tweet_fields=["text", "author_id", "created_at"],
                expansions=["author_id"]
            )

            if mentions and mentions.data:
                for tweet in mentions.data:
                    # Не отвечаем на свои же твиты
                    if tweet.author_id == me.data.id:
                        continue

                    # Получаем текст
                    text = tweet.text
                    logger.info(f"Найдено упоминание: {text[:50]}...")

                    # Отвечаем
                    self.reply_to_tweet(tweet.id, text)

                    # Пауза
                    delay = self.humanizer.get_random_delay(
                        BOT_SETTINGS["reply_delay_min"],
                        BOT_SETTINGS["reply_delay_max"]
                    )
                    time.sleep(delay)

        except tweepy.TweepyException as e:
            logger.error(f"Ошибка проверки упоминаний: {e}")

    def run_once(self):
        """Один цикл действий"""
        now = datetime.now()
        logger.info(f"--- Цикл: {now.strftime('%Y-%m-%d %H:%M:%S')} ---")

        # Проверяем активное время
        if not BehaviorPattern.is_active_hour(now,
                                               BOT_SETTINGS["morning_hours"],
                                               BOT_SETTINGS["evening_hours"]):
            logger.info("Вне активных часов, пропускаем пост")
            return

        # Проверяем день
        if not BehaviorPattern.should_post_today(now, BOT_SETTINGS["active_days"]):
            logger.info("Выходной, снижаем активность")

        # 1. Публикуем пост (60% шанс в цикле)
        if random.random() < 0.6 and self.stats.can_post():
            self.post_tweet()

        # 2. Проверяем упоминания
        if random.random() < 0.4:
            self.check_mentions_and_reply()

        # 3. Поиск и лайк/ретвит
        if random.random() < 0.5:
            keyword = random.choice(ENGAGEMENT_KEYWORDS)
            action = random.choice(["like", "like", "retweet"])  # Лайков больше
            self.search_and_engage(keyword, action)

    def run(self):
        """Основной цикл бота"""
        logger.info("🤖 Twitter бот запущен")
        logger.info(f"Драй-ран: {self.dry_run}")

        cycle_count = 0

        while self.running:
            try:
                self.run_once()
                cycle_count += 1

                # Следующий цикл — случайная пауза
                delay = self.humanizer.get_random_delay(
                    BOT_SETTINGS["post_interval_min"],
                    BOT_SETTINGS["post_interval_max"]
                )

                # В выходные увеличиваем паузу
                if datetime.now().weekday() in BOT_SETTINGS["rest_days"]:
                    delay *= 2

                logger.info(f"Следующий цикл через {delay/60:.1f} мин "
                           f"(всего: {cycle_count})")

                # Разбиваем ожидание на части для graceful shutdown
                elapsed = 0
                while elapsed < delay and self.running:
                    time.sleep(min(60, delay - elapsed))
                    elapsed += 60

            except Exception as e:
                logger.error(f"Ошибка в цикле: {e}")
                time.sleep(300)  # 5 минут при ошибке

        logger.info("🛑 Бот остановлен")
        logger.info(self.stats.summary())


def main():
    import argparse

    parser = argparse.ArgumentParser(description="OfficeBot Twitter Agent")
    parser.add_argument("--once", action="store_true", help="Один цикл и выход")
    parser.add_argument("--stats", action="store_true", help="Показать статистику")
    parser.add_argument("--test", action="store_true", help="Тестовый режим (dry run)")
    parser.add_argument("--post", type=str, help="Опубликовать конкретный текст")
    args = parser.parse_args()

    if args.stats:
        stats = Stats()
        print(stats.summary())
        return

    dry_run = args.test or "--test" in sys.argv

    bot = TwitterBot(dry_run=dry_run)

    if args.post:
        bot.post_tweet(args.post)
    elif args.once:
        bot.run_once()
    else:
        bot.run()


if __name__ == "__main__":
    main()
