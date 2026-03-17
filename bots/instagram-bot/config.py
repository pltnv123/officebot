"""
config.py — Настройки Instagram бота
Бренд: pltnv IT / Platonov.AI
"""

import os
from dataclasses import dataclass, field
from typing import List, Dict

@dataclass
class BrandConfig:
    """Бренд-конфигурация"""
    name: str = "Platonov.AI"
    short_name: str = "pltnv"
    tagline: str = "Автоматизация через AI"
    
    # Цвета бренда (для генерации картинок)
    primary_color: str = "#6C63FF"
    secondary_color: str = "#2D2B55"
    accent_color: str = "#00D9FF"
    bg_color: str = "#0F0E17"
    text_color: str = "#FFFFFE"
    
    # Личный тон
    voice: str = "first_person"  # пишем от первого лица
    emoji_level: str = "moderate"  # умеренное использование эмодзи
    language: str = "ru"

@dataclass
class ContentConfig:
    """Настройки контента"""
    posts_per_day: int = 1
    stories_per_day: int = 3
    posting_times: List[str] = field(default_factory=lambda: [
        "09:00",  # Утренний пост
        "12:00",  # Stories обед
        "15:00",  # Stories день  
        "20:00",  # Stories вечер
    ])
    
    # Темы контента
    content_themes: Dict[str, int] = field(default_factory=lambda: {
        "ai_tips": 30,        # 30% — советы по AI
        "case_studies": 25,   # 25% — кейсы
        "tutorials": 20,      # 20% — туториалы
        "behind_scenes": 15,  # 15% — behind scenes
        "results": 10,        # 10% — результаты/метрики
    })

@dataclass  
class HashtagStrategy:
    """Хештег стратегия"""
    
    # Основные хештеги (всегда используем)
    core: List[str] = field(default_factory=lambda: [
        "#AI", "#автоматизация", "#продуктивность", "#IT",
        "#PlatonovAI", "#pltnv"
    ])
    
    # По категориям
    ai_tips: List[str] = field(default_factory=lambda: [
        "#AIсоветы", "#ChatGPT", "#нейросети", "#machinelearning",
        "#искусственныйинтеллект", "#AItools", "#promptengineering"
    ])
    
    case_studies: List[str] = field(default_factory=lambda: [
        "#кейс", "#автоматизациябизнеса", "#AIкейс", "#result",
        "#beforeafter", "#цифроваятрансформация"
    ])
    
    tutorials: List[str] = field(default_factory=lambda: [
        "#туториал", "#howto", "#инструкция", "#обучение",
        "#AITutorial", "#парсинг", "#бот"
    ])
    
    behind_scenes: List[str] = field(default_factory=lambda: [
        "#behindthescenes", "#работадома", "#фреланс",
        "#ITработа", "#деньизжизни", "#workspace"
    ])
    
    results: List[str] = field(default_factory=lambda: [
        "#результат", "#метрики", "#рост", "#success",
        "#ROI", "#эффект", "#прогресс"
    ])
    
    def get_hashtags(self, category: str, count: int = 15) -> List[str]:
        """Получить хештеги для категории"""
        import random
        
        category_map = {
            "ai_tips": self.ai_tips,
            "case_studies": self.case_studies,
            "tutorials": self.tutorials,
            "behind_scenes": self.behind_scenes,
            "results": self.results,
        }
        
        specific = category_map.get(category, [])
        
        # Всегда включаем core + случайные из категории
        all_tags = self.core.copy()
        remaining = count - len(all_tags)
        
        if remaining > 0 and specific:
            additional = random.sample(specific, min(remaining, len(specific)))
            all_tags.extend(additional)
        
        return all_tags

@dataclass
class InstagramConfig:
    """Основная конфигурация Instagram"""
    # API credentials (из переменных окружения)
    username: str = os.getenv("INSTAGRAM_USERNAME", "")
    password: str = os.getenv("INSTAGRAM_PASSWORD", "")
    api_key: str = os.getenv("INSTAGRAM_API_KEY", "")
    
    # Безопасность
    min_delay_seconds: float = 3.0   # Минимальная задержка между действиями
    max_delay_seconds: float = 15.0  # Максимальная задержка
    max_posts_per_day: int = 3       # Лимит постов
    max_stories_per_day: int = 10    # Лимит сторис
    max_likes_per_hour: int = 30     # Лимит лайков в час
    max_comments_per_hour: int = 10  # Лимит комментариев
    
    # Auto-engagement
    target_audience: List[str] = field(default_factory=lambda: [
        "#AIразработчик", "#Python", "#автоматизация",
        "#machinelearning", "#dataScience"
    ])
    
    # Модули
    auto_like: bool = False
    auto_follow: bool = False
    auto_comment: bool = False
    reply_to_dms: bool = True

# Глобальные инстансы
BRAND = BrandConfig()
CONTENT = ContentConfig()
HASHTAGS = HashtagStrategy()
INSTAGRAM = InstagramConfig()
