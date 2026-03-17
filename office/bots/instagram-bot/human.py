"""
human.py — Human-like модуль
Случайные задержки, реальные истории, личный тон
"""

import random
import time
from typing import List, Optional
from datetime import datetime


class Humanizer:
    """Делает бота более человечным"""
    
    # Эмодзи для умеренного использования
    EMOJIS = {
        "positive": ["💪", "🚀", "✨", "🎯", "💡", "🔥", "👀", "🙌"],
        "thinking": ["🤔", "💭", "🧠", "📊"],
        "personal": ["☕", "📝", "💻", "🏠"],
        "result": ["✅", "📈", "🏆", "💰"],
        "ai": ["🤖", "⚡", "🌐", "🔮"],
    }
    
    # Личные фразы (пишем от первого лица)
    PERSONAL_PHRASES = {
        "start": [
            "Я недавно столкнулся с интересной ситуацией...",
            "Давно хотел поделиться этим.",
            "Честно говоря, меня это удивило.",
            "Покажу вам кое-что крутое.",
            "Это реально изменило мою работу.",
            "Пробовал разные подходы, и вот что получилось.",
        ],
        "tip": [
            "Вот что я узнал на практике:",
            "Мой лайфхак:",
            "Работает на ура, проверено:",
            "Это сэкономит вам кучу времени.",
            "Использую каждый день.",
        ],
        "result": [
            "Результат превзошёл ожидания.",
            "Цифры говорят сами за себя.",
            "Было/стало — разница очевидна.",
            "Я был в шоке от результата.",
        ],
        "end": [
            "Надось было полезно! 🙌",
            "Пишите, если есть вопросы.",
            "Это только начало.",
            "Скоро покажу больше деталей.",
            "Делитесь опытом в комментариях!",
        ],
    }
    
    # Реальные истории (шаблоны для заполнения)
    REAL_STORIES = [
        {
            "situation": "Клиент просил сделать {task} вручную",
            "before": "Тратил на это {time_before} каждый день",
            "solution": "Написал бота на Python + AI",
            "after": "Теперь занимает {time_after}, а я пью кофе ☕",
            "metric": "Экономия: {savings}% времени",
        },
        {
            "situation": "Нужно было обработать {task}",
            "before": "Раньше это был ад {emoji}",
            "solution": "Подключил нейросеть + автоматизацию",
            "after": "Всё работает само",
            "metric": "Ускорение в {x} раз",
        },
    ]
    
    def __init__(self, config=None):
        self.config = config
        self.action_history: List[dict] = []
    
    @staticmethod
    def random_delay(min_seconds: float = 2.0, max_seconds: float = 10.0) -> float:
        """Случайная задержка (человеческое поведение)"""
        # Используем normal distribution для более естественных задержек
        mean = (min_seconds + max_seconds) / 2
        std = (max_seconds - min_seconds) / 4
        delay = random.normalvariate(mean, std)
        return max(min_seconds, min(delay, max_seconds))
    
    @staticmethod
    def human_sleep(min_seconds: float = 2.0, max_seconds: float = 10.0):
        """Человеческая пауза"""
        delay = Humanizer.random_delay(min_seconds, max_seconds)
        time.sleep(delay)
        return delay
    
    @classmethod
    def add_emoji(cls, text: str, category: str = "positive", count: int = 1) -> str:
        """Добавить эмодзи умеренно"""
        emojis = cls.EMOJIS.get(category, cls.EMOJIS["positive"])
        selected = random.sample(emojis, min(count, len(emojis)))
        
        # Добавляем в случайное место (не в начало и не в конец)
        words = text.split()
        if len(words) > 3:
            pos = random.randint(1, len(words) - 1)
            words.insert(pos, random.choice(selected))
            return " ".join(words)
        return text + " " + " ".join(selected)
    
    @classmethod
    def make_personal(cls, text: str, category: str = "start") -> str:
        """Добавить личный тон"""
        phrases = cls.PERSONAL_PHRASES.get(category, [])
        if phrases:
            prefix = random.choice(phrases)
            return f"{prefix}\n\n{text}"
        return text
    
    @classmethod
    def generate_story(cls, topic: str = "ai_automation") -> dict:
        """Сгенерировать реальную историю"""
        import random
        
        template = random.choice(cls.REAL_STORIES)
        
        # Заполняем шаблон
        story = {
            "situation": template["situation"].format(
                task=random.choice(["парсинг сайтов", "обработку заявок", "ответы клиентов", "сбор данных"])
            ),
            "before": template["before"].format(
                time_before=random.choice(["2-3 часа", "полдня", "весь вечер", "40 минут"]),
                emoji=random.choice(["😤", "😩", "💢"])
            ),
            "solution": template["solution"],
            "after": template["after"].format(
                time_after=random.choice(["5 минут", "2 минуты", "30 секунд", "автоматически"])
            ),
            "metric": template["metric"].format(
                savings=random.randint(70, 95),
                x=random.randint(5, 20)
            ),
        }
        
        return story
    
    @classmethod
    def format_story_text(cls, story: dict) -> str:
        """Форматировать историю в текст поста"""
        parts = [
            story["situation"],
            "",
            f"До: {story['before']}",
            f"После: {story['after']}",
            "",
            f"⚡ {story['solution']}",
            "",
            f"📊 {story['metric']}",
        ]
        return "\n".join(parts)
    
    @classmethod
    def randomize_text(cls, text: str) -> str:
        """Сделать текст менее шаблонным"""
        # Варианты написания одних и тех же фраз
        replacements = {
            "Вот как": random.choice(["Смотрите как", "Покажу как", "Расскажу как", "Вот способ"]),
            "Важно": random.choice(["Ключевой момент", "Стоит запомнить", "Обратите внимание", "Main point"]),
            "Результат": random.choice(["Итог", "Что получилось", "Финал", "Outcome"]),
            "Используйте": random.choice(["Попробуйте", "Применяйте", "Берите на заметку", "Рекомендую"]),
            "Простой": random.choice(["Лёгкий", "Не сложный", "Понятный", "Быстрый"]),
        }
        
        result = text
        for old, new in replacements.items():
            if old in result and random.random() > 0.5:
                result = result.replace(old, new, 1)
        
        return result
    
    @classmethod
    def get_writing_style(cls) -> dict:
        """Получить текущий стиль письма"""
        styles = [
            {
                "name": "casual_tech",
                "description": "Неформальный технический",
                "examples": [
                    "Короче, забил я на ручную работу",
                    "Кинул в чат код — и готово",
                    "Питон спасёт, как всегда",
                ]
            },
            {
                "name": "enthusiast",
                "description": "Энтузиаст AI",
                "examples": [
                    "Нейросети реально меняют подход к работе!",
                    "То, что я увидел, просто вау",
                    "AI становится нашим лучшим помощником",
                ]
            },
            {
                "name": "practical",
                "description": "Практик без воды",
                "examples": [
                    "Коротко и по делу.",
                    "Формула простая.",
                    "Работает — не трогай.",
                ]
            },
        ]
        return random.choice(styles)


class PersonalExperience:
    """Генератор 'личного опыта' для контента"""
    
    WORK_SCENARIOS = [
        {
            "title": "Утро в IT",
            "content": "6:30 утра. Кофе готов, почта проверена. "
                      "За 15 минут до officially work обновил бота — "
                      "теперь он сам categorize заявки. Мелочь, но приятно.",
        },
        {
            "title": "Когда клиент не верит в AI",
            "content": "Сказал клиенту, что его задачу можно автоматизировать. "
                      "Посмотрел скептически. "
                      "Через неделю показал результат — теперь спрашивает, "
                      "что ещё можно сделать. 😏",
        },
        {
            "title": "Мой стек",
            "content": "Часто спрашивают, чем работаю. "
                      "Python + нейросети + куча API. "
                      "Звучит просто, но каждый проект — это отдельная вселенная.",
        },
        {
            "title": "Рабочее место",
            "content": "Монитор, клавиатура, тишина. "
                      "И тут же на экране — три AI ассистента делают работу за пять человек. "
                      "Люблю такие моменты.",
        },
    ]
    
    @classmethod
    def get_random_scenario(cls) -> dict:
        """Получить случайный сценарий"""
        return random.choice(cls.WORK_SCENARIOS)
    
    @classmethod
    def format_as_story(cls) -> str:
        """Отформатировать как сторис"""
        scenario = cls.get_random_scenario()
        return f"📌 {scenario['title']}\n\n{scenario['content']}"


if __name__ == "__main__":
    # Тестирование
    h = Humanizer()
    
    print("=== Тест Humanizer ===\n")
    
    # Тест задержки
    delay = h.random_delay(1, 5)
    print(f"Случайная задержка: {delay:.2f} сек\n")
    
    # Тест эмодзи
    text = "Этот подход реально работает"
    print(f"С эмодзи: {h.add_emoji(text, 'positive')}\n")
    
    # Тест персонализации
    tip = "Используйте автоматизацию для рутинных задач"
    print(f"Персонально: {h.make_personal(tip, 'tip')}\n")
    
    # Тест истории
    story = h.generate_story()
    print(f"История:\n{h.format_story_text(story)}\n")
    
    # Тест личного опыта
    print(f"Личный опыт:\n{PersonalExperience.format_as_story()}")
