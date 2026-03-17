"""
bot.py — Instagram бот для Platonov.AI
Публикация постов, Stories, ответы на сообщения, Auto-engagement
"""

import os
import json
import time
import random
import logging
from datetime import datetime
from typing import Optional, List, Dict
from pathlib import Path

from config import BRAND, CONTENT, HASHTAGS, INSTAGRAM
from human import Humanizer
from content_planner import ContentPlanner, ContentItem, DailyPlan
from image_generator import ImageGenerator

# Создаем output директорию если не существует
OUTPUT_DIR_BASE = Path(__file__).parent / "output"
OUTPUT_DIR_BASE.mkdir(parents=True, exist_ok=True)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(OUTPUT_DIR_BASE / "bot.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class InstagramBot:
    """Основной класс Instagram бота"""
    
    OUTPUT_DIR = Path(__file__).parent / "output"
    
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.humanizer = Humanizer()
        self.planner = ContentPlanner()
        self.image_gen = ImageGenerator()
        
        self.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        # Статистика
        self.stats = {
            "posts_published": 0,
            "stories_published": 0,
            "replies_sent": 0,
            "likes_given": 0,
            "comments_given": 0,
            "errors": 0,
            "started_at": datetime.now().isoformat(),
        }
        
        # Очередь контента
        self.queue: List[ContentItem] = []
        
        logger.info(f"Instagram Bot инициализирован (dry_run={dry_run})")
        logger.info(f"Бренд: {BRAND.name}")
    
    def _save_stats(self):
        """Сохранить статистику"""
        stats_file = self.OUTPUT_DIR / "stats.json"
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(self.stats, f, ensure_ascii=False, indent=2)
    
    def _save_queue(self):
        """Сохранить очередь"""
        queue_file = self.OUTPUT_DIR / "queue.json"
        with open(queue_file, 'w', encoding='utf-8') as f:
            json.dump([item.to_dict() for item in self.queue], f, ensure_ascii=False, indent=2)
    
    # === Публикация постов ===
    
    def create_post(self, category: Optional[str] = None) -> ContentItem:
        """Создать пост"""
        post = self.planner.generate_post(category)
        logger.info(f"Создан пост: {post.title}")
        return post
    
    def publish_post(self, post: ContentItem, image_path: Optional[str] = None) -> bool:
        """Опубликовать пост"""
        logger.info(f"Публикация поста: {post.title}")
        
        if self.dry_run:
            logger.info("[DRY RUN] Пост не опубликован (режим тестирования)")
            # Сохраняем в файл для просмотра
            preview_file = self.OUTPUT_DIR / f"preview_post_{post.id}.json"
            with open(preview_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "title": post.title,
                    "caption": post.caption,
                    "hashtags": post.hashtags,
                    "scheduled_time": post.scheduled_time,
                    "image_path": image_path,
                }, f, ensure_ascii=False, indent=2)
            
            self.stats["posts_published"] += 1
            self._save_stats()
            return True
        
        # Здесь будет реальная публикация через Instagram API
        # try:
        #     from instagrapi import Client
        #     cl = Client()
        #     cl.login(INSTAGRAM.username, INSTAGRAM.password)
        #     cl.photo_upload(image_path, post.caption)
        # except Exception as e:
        #     logger.error(f"Ошибка публикации: {e}")
        #     self.stats["errors"] += 1
        #     return False
        
        return True
    
    def create_and_publish_post(self, category: Optional[str] = None) -> bool:
        """Создать и опубликовать пост (полный цикл)"""
        # 1. Создаём пост
        post = self.create_post(category)
        
        # 2. Генерируем изображение
        image_path = self.generate_post_image(post)
        
        # 3. Публикуем
        success = self.publish_post(post, image_path)
        
        if success:
            self.planner.mark_published(post, image_path)
        
        # Human delay
        self.humanizer.human_sleep(2, 5)
        
        return success
    
    # === Stories ===
    
    def create_story(self, category: Optional[str] = None) -> ContentItem:
        """Создать Story"""
        story = self.planner.generate_story(category)
        logger.info(f"Создана Story: {story.title}")
        return story
    
    def publish_story(self, story: ContentItem, image_path: Optional[str] = None) -> bool:
        """Опубликовать Story"""
        logger.info(f"Публикация Story: {story.title}")
        
        if self.dry_run:
            logger.info("[DRY RUN] Story не опубликована (режим тестирования)")
            self.stats["stories_published"] += 1
            self._save_stats()
            return True
        
        # Здесь будет реальная публикация
        return True
    
    def create_and_publish_story(self, category: Optional[str] = None) -> bool:
        """Создать и опубликовать Story"""
        story = self.create_story(category)
        
        # Генерируем изображение для Story
        image_path = self.image_gen.create_story_template(
            title=story.title,
            subtitle=f"{BRAND.name}",
            output_name=f"story_{story.id}.png"
        )
        
        success = self.publish_story(story, image_path)
        
        if success:
            self.planner.mark_published(story, image_path)
        
        self.humanizer.human_sleep(1, 3)
        
        return success
    
    # === Генерация изображений ===
    
    def generate_post_image(self, post: ContentItem) -> Optional[str]:
        """Сгенерировать изображение для поста"""
        category = post.category
        
        if category == "ai_tips":
            return self.image_gen.create_tip_card(
                title=post.title,
                tips=["Совет из поста", "Смотрите подробности в описании"],
                output_name=f"post_{post.id}.png"
            )
        elif category == "case_studies":
            return self.image_gen.create_case_study_card(
                before="Было сложно",
                after="Стало просто",
                metric="Результат",
                output_name=f"post_{post.id}.png"
            )
        elif category == "results":
            return self.image_gen.create_infographic(
                title=post.title,
                data={"items": [
                    {"label": "Метрика", "value": "100%", "bar": 100},
                ]},
                output_name=f"post_{post.id}.png"
            )
        else:
            # Quote card по умолчанию
            return self.image_gen.create_quote_card(
                quote=post.title,
                author=BRAND.name,
                output_name=f"post_{post.id}.png"
            )
    
    # === Ответы на сообщения ===
    
    def reply_to_message(self, message: str, username: str) -> Optional[str]:
        """Ответить на сообщение"""
        logger.info(f"Сообщение от @{username}: {message[:50]}...")
        
        # Базовые ответы
        responses = {
            "привет": f"Привет! 👋 Рад видеть тебя здесь. Чем могу помочь?",
            "как дела": f"Отлично, спасибо! Работаю над новыми проектами 🚀",
            "что ты делаю": f"Помогаю людям автоматизировать рутину с помощью AI 💪",
            "расскажи": f"Посмотри мой последний пост! Там подробно описываю процесс 📝",
            "цена": f"Напиши мне в личку, обсудим детали! 📩",
            "контакт": f"📧 Email в профиле. Пишите, отвечу быстро!",
        }
        
        message_lower = message.lower()
        
        for keyword, response in responses.items():
            if keyword in message_lower:
                # Добавляем human delay перед ответом
                delay = self.humanizer.random_delay(3, 30)
                logger.info(f"Ответ через {delay:.1f} сек")
                
                if not self.dry_run:
                    time.sleep(delay)
                
                self.stats["replies_sent"] += 1
                self._save_stats()
                
                return response
        
        # Стандартный ответ
        default = f"Спасибо за сообщение! 🙏 Отвечу в ближайшее время."
        self.stats["replies_sent"] += 1
        self._save_stats()
        
        return default
    
    # === Auto-engagement ===
    
    def auto_like(self, hashtags: Optional[List[str]] = None, count: int = 10) -> int:
        """Автоматические лайки по хештегам"""
        if not INSTAGRAM.auto_like:
            logger.info("Auto-like отключен в конфиге")
            return 0
        
        tags = hashtags or INSTAGRAM.target_audience[:3]
        likes_given = 0
        
        logger.info(f"Auto-like по хештегам: {tags}")
        
        for tag in tags:
            for _ in range(min(count // len(tags), 10)):
                # Human delay
                delay = self.humanizer.random_delay(
                    INSTAGRAM.min_delay_seconds,
                    INSTAGRAM.max_delay_seconds
                )
                
                logger.info(f"[DRY RUN] Лайк по #{tag} через {delay:.1f} сек")
                likes_given += 1
                
                if not self.dry_run:
                    time.sleep(delay)
                    # Здесь будет реальный лайк
                    # cl.media_like(media_id)
        
        self.stats["likes_given"] += likes_given
        self._save_stats()
        
        return likes_given
    
    def auto_comment(self, count: int = 5) -> int:
        """Автоматические комментарии"""
        if not INSTAGRAM.auto_comment:
            logger.info("Auto-comment отключен в конфиге")
            return 0
        
        templates = [
            "Отличная работа! 🔥",
            "Полезный контент, спасибо! 🙌",
            "Подписался, жду новые посты! 👀",
            "Классный результат! 💪",
            "Интересный подход, надо попробовать",
        ]
        
        comments_given = 0
        
        for _ in range(count):
            comment = random.choice(templates)
            delay = self.humanizer.random_delay(5, 20)
            
            logger.info(f"[DRY RUN] Комментарий: '{comment}' через {delay:.1f} сек")
            comments_given += 1
            
            if not self.dry_run:
                time.sleep(delay)
        
        self.stats["comments_given"] += comments_given
        self._save_stats()
        
        return comments_given
    
    # === Планирование ===
    
    def schedule_daily_content(self) -> DailyPlan:
        """Запланировать контент на день"""
        plan = self.planner.generate_daily_plan()
        
        logger.info(f"Создан план на {plan.date}")
        logger.info(f"  Постов: {len(plan.posts)}")
        logger.info(f"  Stories: {len(plan.stories)}")
        
        # Добавляем в очередь
        self.queue.extend(plan.posts)
        self.queue.extend(plan.stories)
        
        self.planner.save_plan(plan)
        self._save_queue()
        
        return plan
    
    def run_daily(self):
        """Запустить ежедневный цикл"""
        logger.info("="*60)
        logger.info(f"🚀 Запуск ежедневного цикла: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        logger.info("="*60)
        
        # 1. Планируем контент
        plan = self.schedule_daily_content()
        
        # 2. Публикуем пост (если есть в плане)
        if plan.posts:
            post = plan.posts[0]
            logger.info(f"\n📝 Публикуем пост: {post.title}")
            self.create_and_publish_post(post.category)
        
        # 3. Публикуем Stories
        for i, story in enumerate(plan.stories):
            logger.info(f"\n📱 Публикуем Story {i+1}/{len(plan.stories)}: {story.title}")
            self.create_and_publish_story(story.category)
        
        # 4. Auto-engagement (если включен)
        if INSTAGRAM.auto_like:
            logger.info("\n❤️ Auto-like сессия")
            self.auto_like(count=10)
        
        # 5. Итоги
        logger.info("\n" + "="*60)
        logger.info("📊 Итоги дня:")
        logger.info(f"  Постов: {self.stats['posts_published']}")
        logger.info(f"  Stories: {self.stats['stories_published']}")
        logger.info(f"  Ответов: {self.stats['replies_sent']}")
        logger.info(f"  Лайков: {self.stats['likes_given']}")
        logger.info(f"  Ошибок: {self.stats['errors']}")
        logger.info("="*60)
        
        self._save_stats()
    
    def get_stats(self) -> dict:
        """Получить статистику бота"""
        return self.stats
    
    def print_stats(self):
        """Вывести статистику"""
        print("\n📊 Статистика бота:")
        print(f"  📝 Постов опубликовано: {self.stats['posts_published']}")
        print(f"  📱 Stories опубликовано: {self.stats['stories_published']}")
        print(f"  💬 Ответов отправлено: {self.stats['replies_sent']}")
        print(f"  ❤️ Лайков: {self.stats['likes_given']}")
        print(f"  💭 Комментариев: {self.stats['comments_given']}")
        print(f"  ❌ Ошибок: {self.stats['errors']}")


def demo():
    """Демонстрация бота"""
    print("🤖 Instagram Bot Demo\n")
    
    # Создаём бота в dry-run режиме
    bot = InstagramBot(dry_run=True)
    
    # 1. Создаём и публикуем пост
    print("\n=== 1. Создание поста ===")
    bot.create_and_publish_post("ai_tips")
    
    # 2. Создаём и публикуем Story
    print("\n=== 2. Создание Stories ===")
    bot.create_and_publish_story("behind_scenes")
    bot.create_and_publish_story("case_studies")
    
    # 3. Ответ на сообщение
    print("\n=== 3. Ответ на сообщение ===")
    reply = bot.reply_to_message("Привет! Расскажи о себе", "test_user")
    print(f"Ответ: {reply}")
    
    # 4. Auto-engagement
    print("\n=== 4. Auto-engagement ===")
    likes = bot.auto_like(count=3)
    print(f"Лайков: {likes}")
    
    # 5. Планирование на день
    print("\n=== 5. Планирование дня ===")
    plan = bot.schedule_daily_content()
    bot.planner.print_plan(plan)
    
    # 6. Статистика
    print("\n=== 6. Статистика ===")
    bot.print_stats()
    
    print("\n✅ Демо завершено!")
    print(f"📁 Файлы в: {bot.OUTPUT_DIR}")


if __name__ == "__main__":
    demo()
