"""
Генератор контента для Twitter бота
Использует OpenRouter API для создания постов
"""

import json
import random
import re
import logging
from datetime import datetime
from typing import Optional

try:
    import requests
except ImportError:
    requests = None

from config import OPENROUTER_CONFIG, POST_TOPICS, BOT_SETTINGS
from human import Humanizer, BehaviorPattern

logger = logging.getLogger(__name__)


class ContentGenerator:
    """Генерирует контент для Twitter постов"""

    def __init__(self):
        self.api_key = OPENROUTER_CONFIG["api_key"]
        self.model = OPENROUTER_CONFIG["model"]
        self.base_url = OPENROUTER_CONFIG["base_url"]
        self.humanizer = Humanizer(typo_chance=BOT_SETTINGS["typo_chance"])

        # Бот persona — вымышленный персонаж
        self.persona = self._build_persona()

    def _build_persona(self) -> str:
        """Строит персонажа бота"""
        return """Ты — разработчик и фрилансер по имени Макс (возраст ~28). 
Ты работаешь из дома, занимаешься автоматизацией процессов для клиентов.
Ты используешь AI инструменты каждый день и делишься своим опытом.

Твои черты:
- Пишешь НЕформально, как обычный человек в твиттере
- Иногда используешь сленг: "короче", "кстати", "типа того"
- Не стесняешься говорить что-то вроде "блин" или "лол"
- Делишься реальным опытом (даже если вымышленным)
- Иногда жалеешься на рутину
- Хвастаешься когда что-то получилось
- Спрашиваешь советы у других
- НЕ пишешь как ChatGPT — никаких "Я рад поделиться" или "Отличный вопрос!"
- Пишешь короткими фразами, абзацами
- Иногда ставишь смайлики не в конце, а в середине текста"""

    def _get_style_instructions(self) -> str:
        """Стилистические инструкции для генерации"""
        mood = BehaviorPattern.get_current_mood()
        tone = mood["tone"]

        styles = {
            "energetic": "Пиши энергично, с энтузиазмом. Короткие предложения. Много эмодзи.",
            "relaxed": "Пиши расслабленно, вечерний тон. Поделись мыслями за день.",
            "professional": "Пиши по делу, рабочий тон. Полезные инсайты.",
        }

        return f"""Стиль: {styles.get(tone, styles['professional'])}

Правила (СТРОГО):
- Максимум 280 символов
- НЕ начинай с "Привет!" или "Хочу поделиться"
- НЕ используй шаблонные фразы вроде "5 способов..." или "Топ-3 инструмента"
- Пиши КОНКРЕТНЫЙ опыт/ситуацию
- Можешь начать с "вот", "кстати", "знаете что", "блин" или просто с главной мысли
- Хештеги ставь в конце (1-3 штуки) или не ставь вообще
- Можно без знаков препинания в конце
- Иногда задавай вопрос в конце"""

    def _get_topic_context(self, topic_key: Optional[str] = None) -> tuple:
        """Получает контекст темы для генерации"""
        if topic_key is None:
            # Выбираем тему по весам
            topics = list(POST_TOPICS.keys())
            weights = [POST_TOPICS[t]["weight"] for t in topics]
            topic_key = random.choices(topics, weights=weights, k=1)[0]

        topic = POST_TOPICS.get(topic_key, POST_TOPICS["personal_experience"])
        hashtags = random.sample(
            topic["hashtags"],
            min(len(topic["hashtags"]), random.randint(1, 3))
        ) if topic["hashtags"] else []

        return topic_key, hashtags

    def _get_topic_prompt(self, topic_key: str) -> str:
        """Промпт для конкретной темы"""
        prompts = {
            "ai_automation": """Напиши твит про опыт использования AI/нейросетей.
Примеры:
- Как настроил бота для ответов клиентов
- Как AI помог автоматизировать скучную задачу
- Сравнил два AI инструмента
- Как ChatGPT помог в рабочем проекте
Не général — конкретная ситуация.""",

            "productivity": """Напиши твит про продуктивность и тайм-менеджмент.
Примеры:
- Какой трюк сэкономил тебе время
- Инструмент который изменил рабочий процесс
- Как ты борешься с прокрастинацией
- Как организуешь рабочий день
Конкретные детали, не общие слова.""",

            "dev_tools": """Напиши твит про разработку и инструменты.
Примеры:
- Крутой CLI инструмент который нашёл
- Как упростил CI/CD
- Библиотека которая удивила
- Трюк в коде который экономит время
Будь конкретным.""",

            "business_startup": """Напиши твит про бизнес/фриланс/стартапы.
Примеры:
- Как нашёл/потерял клиента
- Цифры из проекта (выручка, экономия)
- Урок от которой болезненно учился
- Как автоматизировал бизнес-процесс
Реалистичные детали.""",

            "personal_experience": """Напиши твит — личное наблюдение или мысль.
Примеры:
- Заметил что...
- Сегодня подумал что...
- Вспомнил старый проект и...
- Устал от... но потом...
Может быть любая тема из работы/жизни.""",
        }
        return prompts.get(topic_key, prompts["personal_experience"])

    def generate_post(self, topic_key: Optional[str] = None) -> Optional[str]:
        """Генерирует пост для Twitter"""
        if requests is None:
            logger.error("requests library not installed")
            return None

        topic_key, hashtags = self._get_topic_context(topic_key)
        topic_prompt = self._get_topic_prompt(topic_key)
        style = self._get_style_instructions()

        messages = [
            {"role": "system", "content": self.persona},
            {"role": "user", "content": f"""{style}

Тема: {topic_prompt}

Напиши ОДИН твит (макс 280 символов). Без кавычек. Просто текст."""}
        ]

        try:
            response = self._call_api(messages)
            if response:
                # Очищаем от кавычек если есть
                text = response.strip().strip('"').strip("'")

                # Добавляем hashtags если не влезли
                if hashtags and len(text) < 240:
                    text += "\n\n" + " ".join(hashtags)

                # Применяем human-like обработку
                text = self.humanizer.add_human_touch(text)
                text = self.humanizer.diversify_text(text)
                text = self.humanizer.format_like_human(text)

                # Обрезаем если превысило 280 символов
                if len(text) > 280:
                    text = text[:277] + "..."

                logger.info(f"Generated post ({len(text)} chars): {text[:50]}...")
                return text

        except Exception as e:
            logger.error(f"Error generating post: {e}")

        return None

    def generate_reply(self, original_tweet: str, context: str = "") -> Optional[str]:
        """Генерирует ответ на твит"""
        if requests is None:
            return None

        messages = [
            {"role": "system", "content": self.persona + "\n\nТы отвечаешь на твит."},
            {"role": "user", "content": f"""Оригинальный твит: "{original_tweet}"
{f'Контекст: {context}' if context else ''}

Напиши короткий ответ (макс 280 символов). 
Не будь шаблонным. Будь как живой человек который отвечает в твиттере.
Можно спросить уточняющий вопрос, можно согласиться, можно поспорить.
Без кавычек, просто текст."""}
        ]

        try:
            response = self._call_api(messages)
            if response:
                text = response.strip().strip('"').strip("'")
                text = self.humanizer.add_human_touch(text)

                if len(text) > 280:
                    text = text[:277] + "..."

                return text

        except Exception as e:
            logger.error(f"Error generating reply: {e}")

        return None

    def generate_discussion_start(self, topic: str) -> Optional[str]:
        """Генерирует пост-вопрос для обсуждения"""
        if requests is None:
            return None

        messages = [
            {"role": "system", "content": self.persona},
            {"role": "user", "content": f"""Напиши твит-вопрос чтобы начать обсуждение на тему: {topic}

Это должно быть:
- Реальный вопрос из практики (не "что думаете об AI?")
- Конкретная ситуация
- Приглашение поделиться опытом
- Макс 280 символов

Примеры хороших вопросов:
- "кто как оптимизирует déploiement? у меня уходит 15 мин, чувствую что можно быстрее"
- "клиент просит скидку за срочность — как обычно считаете доплату?"
- "работает ли у кого-то 4-дневка? я пробовал 2 месяца — расскажу что вышло"

Без кавычек."""}
        ]

        try:
            response = self._call_api(messages)
            if response:
                text = response.strip().strip('"').strip("'")
                if len(text) > 280:
                    text = text[:277] + "..."
                return text
        except Exception as e:
            logger.error(f"Error generating discussion: {e}")

        return None

    def _call_api(self, messages: list) -> Optional[str]:
        """Вызов OpenRouter API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/officebot",
            "X-Title": "OfficeBot Twitter Agent",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 300,
            "temperature": 0.85,  # Высокая креативность
            "top_p": 0.9,
        }

        try:
            resp = requests.post(
                self.base_url,
                headers=headers,
                json=payload,
                timeout=30
            )

            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.error(f"API error {resp.status_code}: {resp.text}")
                return None

        except Exception as e:
            logger.error(f"API call failed: {e}")
            return None


# Простой тест
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    gen = ContentGenerator()

    print("=== Тест генерации постов ===\n")

    # Тест разных тем
    for topic in ["ai_automation", "productivity", "dev_tools"]:
        print(f"\n--- Тема: {topic} ---")
        post = gen.generate_post(topic)
        print(post if post else "[Ошибка генерации]")
        print(f"Длина: {len(post) if post else 0} символов")
