"""
Human-like модуль для Twitter бота
Имитирует поведение реального человека
"""

import random
import time
import re
from datetime import datetime
from typing import Optional


class Humanizer:
    """Делает поведение бота похожим на человека"""

    def __init__(self, typo_chance: float = 0.01):
        self.typo_chance = typo_chance

        # Паттерны опечаток (символы рядом на клавиатуре)
        self.keyboard_neighbors = {
            'а': 'ф', 'б': 'и', 'в': 'а', 'г': 'п', 'д': 'о',
            'е': 'к', 'ж': 'д', 'з': 'р', 'и': 'ш', 'к': 'е',
            'л': 'г', 'м': 'ь', 'н': 'т', 'о': 'щ', 'п': 'ч',
            'р': 'к', 'с': 'ы', 'т': 'е', 'у': 'й', 'ф': 'а',
            'х': 'з', 'ц': 'у', 'ч': 'с', 'ш': 'ы', 'щ': 'о',
            'ъ': 'э', 'ы': 'ш', 'ь': 'м', 'э': 'ъ', 'ю': 'б',
            'я': 'ч',
            'a': 's', 'b': 'v', 'c': 'x', 'd': 'f', 'e': 'w',
            'f': 'd', 'g': 'h', 'h': 'g', 'i': 'u', 'j': 'h',
            'k': 'j', 'l': 'k', 'm': 'n', 'n': 'b', 'o': 'i',
            'p': 'o', 'q': 'w', 'r': 'e', 's': 'a', 't': 'r',
            'u': 'y', 'v': 'c', 'w': 'q', 'x': 'z', 'y': 't',
            'z': 'x',
        }

        # Эмодзи паттерны (используются как человек)
        self.emoji_styles = [
            # В конце предложения
            lambda e: f" {e}",
            # После ключевого слова
            lambda e: f"{e} ",
            # Два подряд для акцента
            lambda e: f" {e}{e}",
        ]

        # Сленг и разговорные фразы
        self.slang_phrases = [
            "короче", "кстати", "кстати говоря", "знаешь что",
            "вот честно", "блин", "ооф", "лол", "кек",
            "типа того", "в общем", "плюс минус", "прям",
            "реально", "супер", "круто", "огонь", "топ",
        ]

        # Паузы-междометия
        self.fillers = [
            "...", "..", "——", "—",
            "\n\n", "\n\n\n",
        ]

    def add_typo(self, text: str) -> str:
        """Добавляет случайную опечатку в текст"""
        if random.random() > self.typo_chance:
            return text

        words = text.split()
        if not words:
            return text

        # Выбираем случайное слово (не хештег и не @упоминание)
        valid_words = [w for w in words if not w.startswith('#') and not w.startswith('@') and len(w) > 2]
        if not valid_words:
            return text

        word = random.choice(valid_words)
        if word.lower() not in self.keyboard_neighbors:
            return text

        # Заменяем один символ
        char_idx = random.randint(0, len(word) - 1)
        char = word[char_idx].lower()
        if char in self.keyboard_neighbors:
            replacement = self.keyboard_neighbors[char]
            # Сохраняем регистр
            if word[char_idx].isupper():
                replacement = replacement.upper()
            new_word = word[:char_idx] + replacement + word[char_idx + 1:]
            text = text.replace(word, new_word, 1)

        return text

    def add_human_touch(self, text: str) -> str:
        """Добавляет человечности к тексту"""
        # Иногда добавляем сленг
        if random.random() < 0.2:
            phrases = self.slang_phrases
            phrase = random.choice(phrases)
            # Вставляем в случайное место (не в начало)
            if len(text) > 20:
                pos = random.randint(5, len(text) - 5)
                text = text[:pos] + f", {phrase} " + text[pos:]

        # Иногда добавляем паузу
        if random.random() < 0.15:
            filler = random.choice(self.fillers)
            if len(text) > 30:
                pos = random.randint(10, len(text) - 10)
                text = text[:pos] + filler + text[pos:]

        # Применяем опечатки
        text = self.add_typo(text)

        return text

    @staticmethod
    def get_random_delay(min_sec: int, max_sec: int) -> float:
        """Случайная задержка с небольшим джиттером"""
        base = random.uniform(min_sec, max_sec)
        # Добавляем ±10% джиттер
        jitter = base * random.uniform(-0.1, 0.1)
        return max(1.0, base + jitter)

    @staticmethod
    def is_active_hour(dt: Optional[datetime] = None,
                       morning: tuple = (7, 10),
                       evening: tuple = (18, 22)) -> bool:
        """Проверяет, активное ли сейчас время для поста"""
        if dt is None:
            dt = datetime.now()

        hour = dt.hour
        return (morning[0] <= hour < morning[1] or
                evening[0] <= hour < evening[1])

    @staticmethod
    def should_post_today(dt: Optional[datetime] = None,
                          active_days: tuple = (0, 1, 2, 3, 4)) -> bool:
        """Решает, стоит ли постить сегодня (человеки отдыхают на выходных)"""
        if dt is None:
            dt = datetime.now()

        if dt.weekday() in active_days:
            return True

        # На выходных — 30% шанс
        return random.random() < 0.3

    def diversify_text(self, text: str) -> str:
        """Диверсифицирует текст чтобы не выглядеть шаблонно"""
        variations = [
            # Начинаем с заглавной или нет
            lambda t: t,
            # Строчные буквы в начале
            lambda t: t[0].lower() + t[1:] if t[0].isupper() else t,
            # Добавляем вопрос в конце
            lambda t: t + "\n\nчто думаете?" if "?" not in t and random.random() < 0.3 else t,
            # Добавляем призыв к обсуждению
            lambda t: t + "\n\nделитесь опытом 👇" if random.random() < 0.2 else t,
        ]

        text = random.choice(variations)(text)
        return text

    @staticmethod
    def format_like_human(text: str) -> str:
        """Форматирует текст как человек"""
        # Человеки не ставят пробелы перед ! ? : ;
        # Но иногда ставят два пробела после точки
        text = re.sub(r'\s+!', '!', text)
        text = re.sub(r'\s+\?', '?', text)
        text = re.sub(r'\s+:', ':', text)

        # Иногда два переноса строки
        if random.random() < 0.3:
            text = text.replace('. ', '.\n\n', 1)

        return text.strip()


class BehaviorPattern:
    """Паттерны поведения бота в зависимости от времени"""

    @staticmethod
    def get_morning_mood() -> dict:
        """Утреннее настроение — энергичное"""
        return {
            "tone": "energetic",
            "emoji_chance": 0.7,
            "hashtag_count": (1, 3),
            "length_range": (80, 200),
        }

    @staticmethod
    def get_evening_mood() -> dict:
        """Вечернее настроение — расслабленное"""
        return {
            "tone": "relaxed",
            "emoji_chance": 0.5,
            "hashtag_count": (0, 2),
            "length_range": (50, 150),
        }

    @staticmethod
    def get_midday_mood() -> dict:
        """Дневное настроение — рабочее"""
        return {
            "tone": "professional",
            "emoji_chance": 0.4,
            "hashtag_count": (1, 2),
            "length_range": (100, 250),
        }

    @classmethod
    def get_current_mood(cls, dt: Optional[datetime] = None) -> dict:
        """Получить настроение по времени суток"""
        if dt is None:
            dt = datetime.now()

        hour = dt.hour
        if 6 <= hour < 12:
            return cls.get_morning_mood()
        elif 12 <= hour < 17:
            return cls.get_midday_mood()
        else:
            return cls.get_evening_mood()
