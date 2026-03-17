"""
content_planner.py — План контента для Instagram
1 пост/день, 3 Stories/день, темы: AI кейсы, туториалы, Behind scenes, результаты
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass, field, asdict
from pathlib import Path

from config import BRAND, CONTENT, HASHTAGS
from human import Humanizer, PersonalExperience
from image_generator import CAROUSEL_TEMPLATES


@dataclass
class ContentItem:
    """Элемент контента"""
    id: str
    type: str  # post, story, reel
    category: str  # ai_tips, case_studies, tutorials, behind_scenes, results
    title: str
    caption: str
    hashtags: List[str]
    scheduled_time: str
    status: str = "draft"  # draft, scheduled, published
    image_path: Optional[str] = None
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class DailyPlan:
    """План на день"""
    date: str
    posts: List[ContentItem] = field(default_factory=list)
    stories: List[ContentItem] = field(default_factory=list)
    
    def add_post(self, item: ContentItem):
        self.posts.append(item)
    
    def add_story(self, item: ContentItem):
        self.stories.append(item)
    
    def to_dict(self) -> dict:
        return {
            "date": self.date,
            "posts": [p.to_dict() for p in self.posts],
            "stories": [s.to_dict() for s in self.stories],
        }


# === Темы и шаблоны контента ===

CONTENT_TOPICS = {
    "ai_tips": [
        {
            "title": "5 промптов, которые экономят время",
            "content": "Я каждый день использую эти промпты в работе. "
                      "Заберите себе — точно пригодятся.",
            "carousel": "ai_tips",
        },
        {
            "title": "ChatGPT vs Claude: когда что использовать",
            "content": "Долго не мог понять, когда брать один или другой. "
                      "Вот мои наблюдения после месяца использования.",
        },
        {
            "title": "Как я автоматизировал рутину на работе",
            "content": "Каждое утро тратил 30 минут на одну и ту же задачу. "
                      "Теперь бот делает это за 30 секунд.",
        },
        {
            "title": "AI-инструменты, которыми пользуюсь каждый день",
            "content": "Поделюсь своим стеком. Ничего лишнего, только рабочие инструменты.",
        },
        {
            "title": "Зачем учить промпт-инжиниринг в 2025",
            "content": "Это новый Excel. Поверьте мне.",
        },
    ],
    
    "case_studies": [
        {
            "title": "Клиент просил парсить 100 сайтов в день",
            "content": "Раньше команда из 3 человек сидела на этом. "
                      "Теперь один бот + чашка кофе.",
            "before": "4 часа вручную каждый день",
            "after": "15 минут автоматически",
            "metric": "Экономия: 92%",
        },
        {
            "title": "Автоматизация отчётов для клиента",
            "content": "Клиент хотел отчёт каждую пятницу. "
                      "Раньше это был кошмар. Теперь — клик.",
            "before": "5 часов на отчёт",
            "after": "5 секунд, рассылка автоматически",
            "metric": "x600 быстрее",
        },
        {
            "title": "Как AI помог выиграть тендер",
            "content": "Нужно было подготовить документацию за ночь. "
                      "В одиночку не справился бы.",
            "before": "3 дня работы вручную",
            "after": "6 часов с AI",
            "metric": "Успели в срок",
        },
    ],
    
    "tutorials": [
        {
            "title": "Telegram-бот за 30 минут",
            "content": "Шаг за шагом создадим бота, который отвечает через ChatGPT. "
                      "Все коды приложу.",
            "steps": [
                "Создаём бота через @BotFather",
                "Устанавливаем python-telegram-bot",
                "Подключаем OpenAI API",
                "Пишем хендлер сообщений",
                "Деплоим на сервер",
            ],
        },
        {
            "title": "Парсинг сайтов с BeautifulSoup",
            "content": "Покажу, как собирать данные с любого сайта за 5 минут. "
                      "Легально и быстро.",
        },
        {
            "title": "Настройка автоответчика в Instagram",
            "content": "Автоматически отвечать на сообщения — просто. "
                      "Вот как я это сделал.",
        },
    ],
    
    "behind_scenes": [
        {
            "title": "Мой рабочий процесс",
            "content": "Утро, кофе, код. Показываю, как выглядит мой день. "
                      "Никакого гламура, только реальность.",
        },
        {
            "title": "Что я читаю/смотрю",
            "content": "Поделюсь ресурсами, которые помогают расти. "
                      "Без рекламы, только干货.",
        },
        {
            "title": "Ошибки, которые я совершил",
            "content": "Чтобы вы не повторили. Честно о провалах.",
        },
        {
            "title": "Комната, где рождаются боты",
            "content": "Мой workspace. Ничего особенного, но мне нравится. "
                      "Покажу своё рабочее место.",
        },
    ],
    
    "results": [
        {
            "title": "Месяц автоматизации: итоги",
            "content": "Сделал 10 ботов. Два из них живут и работают. "
                      "Цифры и выводы.",
            "metrics": {
                "Проектов": "10",
                "Успешных": "2",
                "Экономия часов": "150+",
            },
        },
        {
            "title": "ROI внедрения AI в рабочий процесс",
            "content": "Считаем реальную выгоду. Не впечатления, а цифры.",
        },
        {
            "title": "Какие задачи AI справляется лучше человека",
            "content": "Я тестировал. Вот честные результаты.",
        },
    ],
}


class ContentPlanner:
    """Планировщик контента"""
    
    PLAN_DIR = Path(__file__).parent / "output" / "plans"
    HISTORY_FILE = Path(__file__).parent / "output" / "content_history.json"
    
    def __init__(self):
        self.PLAN_DIR.mkdir(parents=True, exist_ok=True)
        self.history: List[dict] = self._load_history()
        self.humanizer = Humanizer()
    
    def _load_history(self) -> List[dict]:
        """Загрузить историю контента"""
        if self.HISTORY_FILE.exists():
            with open(self.HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    
    def _save_history(self):
        """Сохранить историю контента"""
        with open(self.HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, ensure_ascii=False, indent=2)
    
    def _generate_id(self, content_type: str) -> str:
        """Сгенерировать ID для контента"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_part = random.randint(1000, 9999)
        return f"{content_type}_{timestamp}_{random_part}"
    
    def _select_category(self) -> str:
        """Выбрать категорию контента по весам"""
        themes = CONTENT.content_themes
        categories = list(themes.keys())
        weights = list(themes.values())
        return random.choices(categories, weights=weights, k=1)[0]
    
    def _get_next_post_time(self, date: datetime, index: int = 0) -> str:
        """Получить время для публикации поста"""
        times = CONTENT.posting_times
        if index < len(times):
            hour, minute = map(int, times[index].split(":"))
            return date.replace(hour=hour, minute=minute).strftime("%Y-%m-%d %H:%M")
        return date.strftime("%Y-%m-%d") + " 09:00"
    
    def generate_post(self, category: Optional[str] = None) -> ContentItem:
        """Сгенерировать пост"""
        if not category:
            category = self._select_category()
        
        topics = CONTENT_TOPICS.get(category, [])
        if not topics:
            category = "ai_tips"
            topics = CONTENT_TOPICS[category]
        
        topic = random.choice(topics)
        
        # Делаем текст более человечным
        caption = self.humanizer.make_personal(topic["content"], "start")
        caption = self.humanizer.randomize_text(caption)
        
        # Добавляем эмодзи
        if random.random() > 0.5:
            caption = self.humanizer.add_emoji(caption, "positive", 1)
        
        # Хештеги
        hashtags = HASHTAGS.get_hashtags(category, 15)
        hashtag_str = "\n\n" + " ".join(["#" + h.lstrip("#") for h in hashtags])
        
        # Финальный caption
        full_caption = caption + hashtag_str
        
        post = ContentItem(
            id=self._generate_id("post"),
            type="post",
            category=category,
            title=topic["title"],
            caption=full_caption,
            hashtags=hashtags,
            scheduled_time=self._get_next_post_time(datetime.now()),
        )
        
        return post
    
    def generate_story(self, category: Optional[str] = None) -> ContentItem:
        """Сгенерировать Story"""
        if not category:
            category = self._select_category()
        
        topics = CONTENT_TOPICS.get(category, [])
        topic = random.choice(topics) if topics else {"title": "Обновление", "content": "Скоро будет интересно!"}
        
        # Stories короче и веселее
        story_text = topic.get("content", "")
        if len(story_text) > 200:
            story_text = story_text[:200] + "..."
        
        story_text = self.humanizer.make_personal(story_text, "start")
        story_text = self.humanizer.add_emoji(story_text, random.choice(["positive", "ai"]), 2)
        
        story = ContentItem(
            id=self._generate_id("story"),
            type="story",
            category=category,
            title=topic["title"],
            caption=story_text,
            hashtags=[],  # Stories не требуют хештегов в тексте
            scheduled_time=self._get_next_post_time(datetime.now()),
        )
        
        return story
    
    def generate_daily_plan(self, date: Optional[datetime] = None) -> DailyPlan:
        """Сгенерировать план на день"""
        if not date:
            date = datetime.now()
        
        plan = DailyPlan(date=date.strftime("%Y-%m-%d"))
        
        # 1 пост в ленту
        post = self.generate_post()
        post.scheduled_time = self._get_next_post_time(date, 0)
        plan.add_post(post)
        
        # 3 Stories
        categories_used = []
        for i in range(3):
            # Пытаемся использовать разные категории
            category = None
            for _ in range(5):
                cat = self._select_category()
                if cat not in categories_used:
                    category = cat
                    categories_used.append(cat)
                    break
            
            story = self.generate_story(category)
            story.scheduled_time = self._get_next_post_time(date, i + 1)
            plan.add_story(story)
        
        return plan
    
    def generate_weekly_plan(self, start_date: Optional[datetime] = None) -> List[DailyPlan]:
        """Сгенерировать план на неделю"""
        if not start_date:
            start_date = datetime.now()
        
        weekly = []
        for day_offset in range(7):
            date = start_date + timedelta(days=day_offset)
            daily = self.generate_daily_plan(date)
            weekly.append(daily)
        
        return weekly
    
    def save_plan(self, plan: DailyPlan, filename: Optional[str] = None):
        """Сохранить план в файл"""
        if not filename:
            filename = f"plan_{plan.date}.json"
        
        filepath = self.PLAN_DIR / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(plan.to_dict(), f, ensure_ascii=False, indent=2)
        
        print(f"✅ План сохранён: {filepath}")
        return filepath
    
    def save_weekly_plan(self, weekly: List[DailyPlan]):
        """Сохранить недельный план"""
        for plan in weekly:
            self.save_plan(plan)
    
    def mark_published(self, item: ContentItem, image_path: Optional[str] = None):
        """Отметить контент как опубликованный"""
        item.status = "published"
        if image_path:
            item.image_path = image_path
        
        self.history.append({
            **item.to_dict(),
            "published_at": datetime.now().isoformat(),
        })
        self._save_history()
    
    def get_content_stats(self) -> dict:
        """Получить статистику контента"""
        total = len(self.history)
        by_category = {}
        by_type = {}
        
        for item in self.history:
            cat = item.get("category", "unknown")
            typ = item.get("type", "unknown")
            
            by_category[cat] = by_category.get(cat, 0) + 1
            by_type[typ] = by_type.get(typ, 0) + 1
        
        return {
            "total": total,
            "by_category": by_category,
            "by_type": by_type,
        }
    
    def print_plan(self, plan: DailyPlan):
        """Вывести план в консоль"""
        print(f"\n{'='*60}")
        print(f"📅 План на {plan.date}")
        print(f"{'='*60}")
        
        print(f"\n📝 Посты в ленту ({len(plan.posts)}):")
        for i, post in enumerate(plan.posts, 1):
            print(f"\n  {i}. [{post.category}] {post.title}")
            print(f"     ⏰ {post.scheduled_time}")
            print(f"     📊 Статус: {post.status}")
            # Показываем начало caption
            preview = post.caption[:100].replace('\n', ' ')
            print(f"     💬 {preview}...")
        
        print(f"\n📱 Stories ({len(plan.stories)}):")
        for i, story in enumerate(plan.stories, 1):
            print(f"\n  {i}. [{story.category}] {story.title}")
            print(f"     ⏰ {story.scheduled_time}")
        
        print(f"\n{'='*60}\n")


def demo():
    """Демонстрация планировщика"""
    planner = ContentPlanner()
    
    print("📋 Демонстрация Content Planner\n")
    
    # Один пост
    post = planner.generate_post("ai_tips")
    print("=== Пример поста ===")
    print(f"Заголовок: {post.title}")
    print(f"Категория: {post.category}")
    print(f"\nCaption:\n{post.caption[:300]}...\n")
    
    # Один Story
    story = planner.generate_story()
    print("=== Пример Story ===")
    print(f"Заголовок: {story.title}")
    print(f"Текст: {story.caption}\n")
    
    # Дневной план
    daily = planner.generate_daily_plan()
    planner.print_plan(daily)
    
    # Сохраняем
    planner.save_plan(daily)
    
    # Недельный план
    weekly = planner.generate_weekly_plan()
    planner.save_weekly_plan(weekly)
    print(f"✅ Недельный план сохранён ({len(weekly)} дней)")


if __name__ == "__main__":
    demo()
