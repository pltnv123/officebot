"""
AI Content Generator — Генерация постов и ответов через OpenRouter
"""

import asyncio
import aiohttp
import json
import random
from typing import Optional

from config import (
    OPENROUTER_API_KEY,
    OPENROUTER_URL,
    AI_MODEL,
    FALLBACK_MODELS,
)
from content_plan import get_post_prompt, get_daily_theme, get_random_topic


class ContentGenerator:
    """Генератор контента через AI"""
    
    def __init__(self):
        self.api_key = OPENROUTER_API_KEY
        self.url = OPENROUTER_URL
        self.primary_model = AI_MODEL
        self.fallback_models = FALLBACK_MODELS
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Получить или создать HTTP сессию"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def _call_ai(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 1500,
        temperature: float = 0.8,
    ) -> Optional[str]:
        """Вызов AI API с fallback"""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://officebot.ai",
            "X-Title": "OfficeBot Channel",
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        
        # Пробуем основную модель и fallback'ы
        models = [self.primary_model] + self.fallback_models
        
        for model in models:
            payload["model"] = model
            try:
                session = await self._get_session()
                async with session.post(
                    self.url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data["choices"][0]["message"]["content"]
                        return content.strip()
                    else:
                        print(f"Model {model} returned {response.status}")
                        continue
            except Exception as e:
                print(f"Model {model} error: {e}")
                continue
        
        return None
    
    async def generate_post(
        self,
        post_type: str,
        day_of_week: int = 0,
    ) -> Optional[str]:
        """
        Генерация поста по типу:
        - morning (greeting + AI tip)
        - midday (case study)
        - afternoon (tutorial)
        - evening (interactive)
        - night (summary)
        """
        
        # Получаем тему для дня
        theme = get_daily_theme(day_of_week)
        topic = get_random_topic(theme)
        
        # Получаем промт
        prompt = get_post_prompt(post_type)
        
        # Системный промт — настройка тона
        system_prompt = """Ты ведёшь Telegram канал про AI и автоматизацию.
Пишешь как живой человек — просто, интересно, с личным опытом.
Не используй канцелярит, не будь слишком формальным.
Используй эмодзи умеренно (1-3 на пост).
Пиши на русском языке.
Не добавляй хэштеги.
Длина: 3-8 предложений в зависимости от типа поста.
Заканчивай пост вопросом или призывом к действию где уместно."""
        
        # Добавляем контекст темы
        prompt_with_context = f"Тема дня: {topic}\n\n{prompt}"
        
        return await self._call_ai(
            prompt=prompt_with_context,
            system_prompt=system_prompt,
            max_tokens=1500,
            temperature=0.85,  # Чуть больше креативности
        )
    
    async def generate_reply(
        self,
        comment: str,
        post_context: str = "",
    ) -> Optional[str]:
        """Генерация ответа на комментарий"""
        
        prompt = get_post_prompt(
            "comment_reply",
            comment=comment,
            context=post_context,
        )
        
        system_prompt = """Ты — автор Telegram канала, отвечаешь на комментарии подписчиков.
Пиши как живой человек — дружелюбно, по делу, не шаблонно.
Ответ должен быть коротким (1-3 предложения).
Используй эмодзи где уместно.
Можно задать уточняющий вопрос.
Пиши на русском языке."""
        
        return await self._call_ai(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=500,
            temperature=0.7,  # Чуть менее креативно для ответов
        )
    
    async def generate_poll_options(
        self,
        topic: str,
    ) -> Optional[list]:
        """Генерация вариантов ответов для опроса"""
        
        prompt = f"""Создай 4 варианта ответа для опроса в Telegram канале про AI.

Тема опроса: {topic}

Требования:
- 4 варианта
- Короткие (2-5 слов)
- Разные по смыслу
- Можно использовать эмодзи

Верни ТОЛЬКО список вариантов, каждый на новой строке, без нумерации."""

        result = await self._call_ai(
            prompt=prompt,
            max_tokens=300,
            temperature=0.8,
        )
        
        if result:
            # Парсим ответ в список
            options = [
                opt.strip().lstrip("•-123456789.) ")
                for opt in result.split("\n")
                if opt.strip()
            ]
            return options[:4]  # Максимум 4 варианта
        
        return None
    
    async def close(self):
        """Закрыть сессию"""
        if self.session and not self.session.closed:
            await self.session.close()


# ─── Singleton ───
_generator: Optional[ContentGenerator] = None

def get_generator() -> ContentGenerator:
    """Получить singleton генератора"""
    global _generator
    if _generator is None:
        _generator = ContentGenerator()
    return _generator


async def test_generator():
    """Тест генератора"""
    gen = get_generator()
    
    print("=== Тест генерации поста (утренний) ===")
    post = await gen.generate_post("greeting", day_of_week=0)
    print(post or "Ошибка генерации")
    
    print("\n=== Тест генерации ответа ===")
    reply = await gen.generate_reply(
        "Крутой пост! А что за инструмент?",
        "Пост про автоматизацию",
    )
    print(reply or "Ошибка генерации")
    
    await gen.close()


if __name__ == "__main__":
    asyncio.run(test_generator())
