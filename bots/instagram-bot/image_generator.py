"""
image_generator.py — Генератор картинок для Instagram
Карусели, инфографика, quote cards, технические схемы
"""

import os
import json
import random
from typing import List, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("⚠️  PIL/Pillow не установлен. Установите: pip install Pillow")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

from config import BRAND


@dataclass
class ImageSize:
    """Размеры изображений для разных форматов"""
    POST = (1080, 1080)        # Квадратный пост
    STORY = (1080, 1920)       # Вертикальная сторис
    CAROUSEL = (1080, 1080)    # Карусель (каждый слайд)
    BANNER = (1200, 628)       # Баннер для шаринга


class ImageGenerator:
    """Генератор изображений для Instagram"""
    
    OUTPUT_DIR = Path(__file__).parent / "output" / "images"
    
    def __init__(self, brand_config=None):
        self.brand = brand_config or BRAND
        self.output_dir = self.OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Загружаем шрифты
        self.fonts = self._load_fonts()
    
    def _load_fonts(self) -> dict:
        """Загрузка шрифтов"""
        fonts = {}
        
        if not PIL_AVAILABLE:
            return fonts
        
        # Пути к шрифтам (Linux)
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        ]
        
        font_path = None
        for path in font_paths:
            if os.path.exists(path):
                font_path = path
                break
        
        if font_path:
            fonts["title"] = ImageFont.truetype(font_path, 64)
            fonts["heading"] = ImageFont.truetype(font_path, 48)
            fonts["body"] = ImageFont.truetype(font_path, 32)
            fonts["small"] = ImageFont.truetype(font_path, 24)
            fonts["tiny"] = ImageFont.truetype(font_path, 18)
        else:
            # Fallback
            fonts["title"] = ImageFont.load_default()
            fonts["heading"] = fonts["title"]
            fonts["body"] = fonts["title"]
            fonts["small"] = fonts["title"]
            fonts["tiny"] = fonts["title"]
        
        return fonts
    
    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Конвертировать HEX в RGB"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def _create_gradient(self, size: Tuple[int, int], 
                         color1: str, color2: str, 
                         direction: str = "vertical") -> Image.Image:
        """Создать градиентный фон"""
        if not PIL_AVAILABLE:
            return None
        
        width, height = size
        img = Image.new('RGB', size)
        draw = ImageDraw.Draw(img)
        
        c1 = self._hex_to_rgb(color1)
        c2 = self._hex_to_rgb(color2)
        
        if direction == "vertical":
            for y in range(height):
                r = int(c1[0] + (c2[0] - c1[0]) * y / height)
                g = int(c1[1] + (c2[1] - c1[1]) * y / height)
                b = int(c1[2] + (c2[2] - c1[2]) * y / height)
                draw.line([(0, y), (width, y)], fill=(r, g, b))
        else:  # horizontal
            for x in range(width):
                r = int(c1[0] + (c2[0] - c1[0]) * x / width)
                g = int(c1[1] + (c2[1] - c1[1]) * x / width)
                b = int(c1[2] + (c2[2] - c1[2]) * x / width)
                draw.line([(x, 0), (x, height)], fill=(r, g, b))
        
        return img
    
    def _draw_rounded_rect(self, draw: ImageDraw.Draw, 
                           xy: Tuple[int, int, int, int], 
                           radius: int, fill: Tuple):
        """Нарисовать скруглённый прямоугольник"""
        x1, y1, x2, y2 = xy
        draw.rectangle([x1+radius, y1, x2-radius, y2], fill=fill)
        draw.rectangle([x1, y1+radius, x2, y2-radius], fill=fill)
        draw.pieslice([x1, y1, x1+2*radius, y1+2*radius], 180, 270, fill=fill)
        draw.pieslice([x2-2*radius, y1, x2, y1+2*radius], 270, 360, fill=fill)
        draw.pieslice([x1, y2-2*radius, x1+2*radius, y2], 90, 180, fill=fill)
        draw.pieslice([x2-2*radius, y2-2*radius, x2, y2], 0, 90, fill=fill)
    
    def create_quote_card(self, quote: str, author: str = "Platonov.AI",
                          output_name: str = "quote_card.png") -> Optional[str]:
        """Создать карточку с цитатой"""
        if not PIL_AVAILABLE:
            print("❌ PIL не доступен")
            return None
        
        size = ImageSize.POST
        img = self._create_gradient(size, self.brand.secondary_color, self.brand.bg_color)
        draw = ImageDraw.Draw(img)
        
        width, height = size
        
        # Декоративный элемент сверху
        accent_rgb = self._hex_to_rgb(self.brand.accent_color)
        draw.rectangle([80, 80, 200, 90], fill=accent_rgb)
        
        # Цитата
        quote_rgb = self._hex_to_rgb(self.brand.text_color)
        
        # Перенос текста
        words = quote.split()
        lines = []
        current_line = ""
        for word in words:
            test = current_line + " " + word if current_line else word
            bbox = draw.textbbox((0, 0), test, font=self.fonts["heading"])
            if bbox[2] - bbox[0] < width - 160:
                current_line = test
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)
        
        # Рисуем цитату
        y_start = height // 2 - len(lines) * 30
        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=self.fonts["heading"])
            x = (width - (bbox[2] - bbox[0])) // 2
            draw.text((x, y_start + i * 60), line, font=self.fonts["heading"], 
                     fill=quote_rgb)
        
        # Автор
        author_text = f"— {author}"
        bbox = draw.textbbox((0, 0), author_text, font=self.fonts["small"])
        x = (width - (bbox[2] - bbox[0])) // 2
        draw.text((x, height - 150), author_text, font=self.fonts["small"], 
                 fill=self._hex_to_rgb(self.brand.primary_color))
        
        # Бренд
        brand_text = self.brand.name
        bbox = draw.textbbox((0, 0), brand_text, font=self.fonts["tiny"])
        draw.text((width - bbox[2] - bbox[0] - 60, height - 80), 
                 brand_text, font=self.fonts["tiny"], fill=(128, 128, 128))
        
        # Сохраняем
        output_path = self.output_dir / output_name
        img.save(output_path, quality=95)
        print(f"✅ Quote card сохранён: {output_path}")
        return str(output_path)
    
    def create_tip_card(self, title: str, tips: List[str], 
                        card_number: int = 1, total: int = 1,
                        output_name: str = "tip_card.png") -> Optional[str]:
        """Создать карточку с советами"""
        if not PIL_AVAILABLE:
            return None
        
        size = ImageSize.POST
        img = self._create_gradient(size, self.brand.bg_color, self.brand.secondary_color)
        draw = ImageDraw.Draw(img)
        
        width, height = size
        
        # Заголовок
        title_rgb = self._hex_to_rgb(self.brand.text_color)
        draw.text((80, 100), title, font=self.fonts["title"], fill=title_rgb)
        
        # Линия под заголовком
        accent_rgb = self._hex_to_rgb(self.brand.accent_color)
        draw.rectangle([80, 200, width - 80, 205], fill=accent_rgb)
        
        # Советы
        y = 260
        tip_rgb = self._hex_to_rgb(self.brand.text_color)
        for i, tip in enumerate(tips[:5]):  # Максимум 5 советов
            number = f"{card_number + i}."
            draw.text((100, y), number, font=self.fonts["body"], 
                     fill=self._hex_to_rgb(self.brand.primary_color))
            draw.text((160, y), tip, font=self.fonts["body"], fill=tip_rgb)
            y += 80
        
        # Номер слайда (для карусели)
        if total > 1:
            slide_text = f"{card_number}/{total}"
            bbox = draw.textbbox((0, 0), slide_text, font=self.fonts["small"])
            draw.text((width - bbox[2] - 60, height - 80), 
                     slide_text, font=self.fonts["small"], fill=(128, 128, 128))
        
        # Бренд
        draw.text((80, height - 80), self.brand.name, 
                 font=self.fonts["tiny"], fill=(128, 128, 128))
        
        output_path = self.output_dir / output_name
        img.save(output_path, quality=95)
        print(f"✅ Tip card сохранён: {output_path}")
        return str(output_path)
    
    def create_carousel(self, title: str, slides: List[dict], 
                        output_prefix: str = "carousel") -> List[str]:
        """Создать карусель (несколько слайдов)"""
        paths = []
        total = len(slides)
        
        for i, slide in enumerate(slides):
            slide_title = slide.get("title", f"Слайд {i+1}")
            slide_content = slide.get("content", [])
            
            path = self.create_tip_card(
                title=slide_title,
                tips=slide_content if isinstance(slide_content, list) else [slide_content],
                card_number=i + 1,
                total=total,
                output_name=f"{output_prefix}_slide_{i+1}.png"
            )
            if path:
                paths.append(path)
        
        return paths
    
    def create_infographic(self, title: str, data: dict,
                          output_name: str = "infographic.png") -> Optional[str]:
        """Создать инфографику"""
        if not PIL_AVAILABLE:
            return None
        
        size = (1080, 1920)  # Высокая для инфографики
        img = self._create_gradient(size, self.brand.bg_color, self.brand.secondary_color)
        draw = ImageDraw.Draw(img)
        
        width, height = size
        
        # Заголовок
        title_rgb = self._hex_to_rgb(self.brand.text_color)
        draw.text((60, 80), title, font=self.fonts["title"], fill=title_rgb)
        
        # Линия
        accent_rgb = self._hex_to_rgb(self.brand.accent_color)
        draw.rectangle([60, 180, width - 60, 185], fill=accent_rgb)
        
        # Данные
        y = 240
        items = data.get("items", [])
        
        for item in items[:8]:
            label = item.get("label", "")
            value = item.get("value", "")
            bar_value = item.get("bar", 0)  # 0-100
            
            # Лейбл
            draw.text((80, y), label, font=self.fonts["body"], fill=title_rgb)
            
            # Значение
            value_text = str(value)
            bbox = draw.textbbox((0, 0), value_text, font=self.fonts["heading"])
            draw.text((width - bbox[2] - 80, y - 5), value_text, 
                     font=self.fonts["heading"], fill=accent_rgb)
            
            # Полоска
            y += 50
            bar_width = width - 160
            bar_fill = int(bar_width * bar_value / 100)
            
            # Фон полоски
            self._draw_rounded_rect(draw, (80, y, width - 80, y + 30), 15, (40, 40, 60))
            # Заполнение
            if bar_fill > 0:
                self._draw_rounded_rect(draw, (80, y, 80 + bar_fill, y + 30), 15, accent_rgb)
            
            y += 100
        
        # Бренд
        draw.text((60, height - 100), self.brand.name, 
                 font=self.fonts["small"], fill=(128, 128, 128))
        
        output_path = self.output_dir / output_name
        img.save(output_path, quality=95)
        print(f"✅ Инфографика сохранена: {output_path}")
        return str(output_path)
    
    def create_case_study_card(self, before: str, after: str,
                               metric: str, 
                               output_name: str = "case_study.png") -> Optional[str]:
        """Создать карточку кейса (до/после)"""
        if not PIL_AVAILABLE:
            return None
        
        size = ImageSize.POST
        img = self._create_gradient(size, self.brand.bg_color, self.brand.secondary_color)
        draw = ImageDraw.Draw(img)
        
        width, height = size
        
        # Заголовок
        draw.text((80, 60), "До / После", font=self.fonts["title"], 
                 fill=self._hex_to_rgb(self.brand.text_color))
        
        # Разделитель
        accent = self._hex_to_rgb(self.brand.accent_color)
        draw.line([(width//2, 200), (width//2, height - 200)], fill=accent, width=3)
        
        # "До" блок
        primary = self._hex_to_rgb(self.brand.primary_color)
        self._draw_rounded_rect(draw, (60, 200, width//2 - 40, height - 200), 20, primary)
        draw.text((80, 280), "ДО", font=self.fonts["heading"], fill=(255, 255, 255))
        
        # Текст "До" (перенос строк)
        words = before.split()
        lines = []
        current = ""
        for word in words:
            test = current + " " + word if current else word
            bbox = draw.textbbox((0, 0), test, font=self.fonts["small"])
            if bbox[2] - bbox[0] < width//2 - 140:
                current = test
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
        
        y = 360
        for line in lines[:8]:
            draw.text((80, y), line, font=self.fonts["small"], fill=(200, 200, 200))
            y += 40
        
        # "После" блок
        secondary_rgb = self._hex_to_rgb(self.brand.secondary_color)
        self._draw_rounded_rect(draw, (width//2 + 40, 200, width - 60, height - 200), 20, secondary_rgb)
        draw.text((width//2 + 60, 280), "ПОСЛЕ", font=self.fonts["heading"], fill=accent)
        
        # Текст "После"
        y = 360
        words = after.split()
        lines = []
        current = ""
        for word in words:
            test = current + " " + word if current else word
            bbox = draw.textbbox((0, 0), test, font=self.fonts["small"])
            if bbox[2] - bbox[0] < width//2 - 140:
                current = test
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
        
        for line in lines[:8]:
            draw.text((width//2 + 60, y), line, font=self.fonts["small"], fill=(200, 200, 200))
            y += 40
        
        # Метрика (внизу, по центру)
        metric_text = f"📊 {metric}"
        bbox = draw.textbbox((0, 0), metric_text, font=self.fonts["heading"])
        x = (width - (bbox[2] - bbox[0])) // 2
        draw.text((x, height - 140), metric_text, font=self.fonts["heading"], fill=accent)
        
        # Бренд
        draw.text((80, height - 80), self.brand.name, 
                 font=self.fonts["tiny"], fill=(128, 128, 128))
        
        output_path = self.output_dir / output_name
        img.save(output_path, quality=95)
        print(f"✅ Case study сохранён: {output_path}")
        return str(output_path)
    
    def create_story_template(self, title: str, subtitle: str = "",
                              style: str = "default",
                              output_name: str = "story.png") -> Optional[str]:
        """Создать шаблон для Stories"""
        if not PIL_AVAILABLE:
            return None
        
        size = ImageSize.STORY
        img = self._create_gradient(size, self.brand.primary_color, self.brand.bg_color)
        draw = ImageDraw.Draw(img)
        
        width, height = size
        
        # Центральный контент
        title_rgb = self._hex_to_rgb(self.brand.text_color)
        accent = self._hex_to_rgb(self.brand.accent_color)
        
        # Заголовок (по центру)
        bbox = draw.textbbox((0, 0), title, font=self.fonts["title"])
        title_width = bbox[2] - bbox[0]
        x = (width - title_width) // 2
        draw.text((x, height // 2 - 80), title, font=self.fonts["title"], fill=title_rgb)
        
        # Подзаголовок
        if subtitle:
            bbox = draw.textbbox((0, 0), subtitle, font=self.fonts["body"])
            sub_width = bbox[2] - bbox[0]
            x = (width - sub_width) // 2
            draw.text((x, height // 2 + 40), subtitle, font=self.fonts["body"], fill=accent)
        
        # Декоративные элементы
        # Сверху
        draw.rectangle([width//2 - 50, 80, width//2 + 50, 85], fill=accent)
        # Снизу
        draw.rectangle([width//2 - 50, height - 120, width//2 + 50, height - 115], fill=accent)
        
        # Бренд
        draw.text((width//2 - 60, height - 80), self.brand.name, 
                 font=self.fonts["small"], fill=(200, 200, 200))
        
        output_path = self.output_dir / output_name
        img.save(output_path, quality=95)
        print(f"✅ Story сохранена: {output_path}")
        return str(output_path)


# === Контент-шаблоны ===

CAROUSEL_TEMPLATES = {
    "ai_tips": {
        "title": "5 AI-советов для продуктивности",
        "slides": [
            {
                "title": "Совет #1: Промпт-инжиниринг",
                "content": [
                    "Формулируйте задачу чётко",
                    "Добавляйте контекст",
                    "Указывайте формат вывода",
                    "Используйте примеры",
                ]
            },
            {
                "title": "Совет #2: Автоматизация",
                "content": [
                    "Найдите рутину",
                    "Опишите процесс",
                    "Доверитесь боту",
                    "Проверяйте результат",
                ]
            },
            {
                "title": "Совет #3: Интеграция",
                "content": [
                    "API — ваш друг",
                    "Telegram + AI = 💪",
                    "Webhooks для связи",
                    "Логируйте всё",
                ]
            },
        ]
    },
    "case_study": {
        "title": "Кейс: Автоматизация парсинга",
        "slides": [
            {
                "title": "Задача",
                "content": [
                    "Собирать данные с 50 сайтов",
                    "Обновлять ежедневно",
                    "Формировать отчёт",
                    "Раньше: 4 часа вручную",
                ]
            },
            {
                "title": "Решение",
                "content": [
                    "Python + BeautifulSoup",
                    "AI для анализа текста",
                    "Автоматический отчёт",
                    "Расписание через cron",
                ]
            },
            {
                "title": "Результат",
                "content": [
                    "5 минут вместо 4 часов",
                    "100% точность",
                    "Работает 24/7",
                    "Экономия: 120 часов/мес",
                ]
            },
        ]
    },
    "tutorial": {
        "title": "Как создать AI-бота за час",
        "slides": [
            {
                "title": "Шаг 1: Подготовка",
                "content": [
                    "Python 3.10+",
                    "pip install openai",
                    "API ключ OpenAI",
                    "Текстовый редактор",
                ]
            },
            {
                "title": "Шаг 2: Код",
                "content": [
                    "Импортируем openai",
                    "Настраиваем клиент",
                    "Пишем функцию",
                    "Добавляем обработку",
                ]
            },
            {
                "title": "Шаг 3: Запуск",
                "content": [
                    "Тестируем локально",
                    "Публикуем на сервер",
                    "Настраиваем авто-старт",
                    "Мониторим логи",
                ]
            },
        ]
    },
}


def demo():
    """Демонстрация генератора изображений"""
    if not PIL_AVAILABLE:
        print("❌ Для работы генератора установите Pillow: pip install Pillow")
        return
    
    gen = ImageGenerator()
    
    print("🎨 Генерация демо-изображений...\n")
    
    # Quote card
    gen.create_quote_card(
        "AI не заменит вас, но человек с AI заменит вас",
        author="Platonov.AI"
    )
    
    # Tip card
    gen.create_tip_card(
        "3 способа использовать ChatGPT в работе",
        [
            "Генерация кода и отладка",
            "Создание документации",
            "Анализ данных и отчёты",
        ]
    )
    
    # Carousel
    template = CAROUSEL_TEMPLATES["ai_tips"]
    gen.create_carousel(
        title=template["title"],
        slides=template["slides"],
        output_prefix="ai_tips"
    )
    
    # Infographic
    gen.create_infographic(
        "AI статистика 2025",
        {
            "items": [
                {"label": "Компаний использует AI", "value": "72%", "bar": 72},
                {"label": "Рост эффективности", "value": "40%", "bar": 40},
                {"label": "Экономия времени", "value": "55%", "bar": 55},
                {"label": "ROI автоматизации", "value": "300%", "bar": 90},
            ]
        }
    )
    
    # Case study
    gen.create_case_study_card(
        before="4 часа ручной работы каждый день",
        after="5 минут автоматически, сплю",
        metric="Экономия: 98% времени"
    )
    
    # Story
    gen.create_story_template(
        title="Новый пост 🚀",
        subtitle="5 AI-советов для продуктивности"
    )
    
    print("\n✅ Все демо-изображения созданы!")
    print(f"📁 Папка: {gen.output_dir}")


if __name__ == "__main__":
    demo()
