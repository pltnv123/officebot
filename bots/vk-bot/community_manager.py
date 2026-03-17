"""
Менеджер сообщества VK
- Приветствие новых участников
- Ответы на вопросы
- Модерация комментариев
"""

import random
import re
from config import BANNED_WORDS, WELCOME_NEW_MEMBERS, REPLY_TO_COMMENTS
from human import generate_greeting, generate_reply, random_pause

# === Приветствие новых участников ===
WELCOME_MESSAGES = [
    "привет! рад что ты с нами 🙌",
    "добро пожаловать! будем рады видеть тебя в комментах 👋",
    "хей, добро пожаловать в сообщество! если есть вопросы — смело пиши",
    "йоу! присоединяйся к обсуждениям, тут интересно 🤖",
    "привет! тут мы обсуждаем всё про AI и автоматизацию — заходи почаще",
]

# === FAQ / Автоответы на частые вопросы ===
FAQ_RESPONSES = [
    {
        "patterns": [r"сколько.*стоит", r"прайс", r"цена", r"стоимость"],
        "reply": "ок, для расчёта напишите в личку — расскажите про задачу и дам точную цену 👍",
    },
    {
        "patterns": [r"как.*связаться", r"контакт", r"телефон", r"почта"],
        "reply": "пишите в личку сообщества — там отвечу быстрее!",
    },
    {
        "patterns": [r"что.*умеете", r"услуги", r"что.*делаете"],
        "reply": "автоматизация, парсинг данных, интеграция сервисов, нейросети. подробнее — в личку или посмотрите посты в сообществе!",
    },
    {
        "patterns": [r"как.*начать", r"где.*учиться", r"как.*выучить"],
        "reply": "лучший способ — делать проекты. начните с малого: напишите скрипт для своей задачи. если нужна помощь — пишите!",
    },
    {
        "patterns": [r"chatgpt", r"chat.*gpt", r"нейросеть.*бесплатн"],
        "reply": "chatgpt есть бесплатный (gpt-3.5), для продвинутых задач — gpt-4 платный. ещё есть аналоги: claude, gemini, yandex gpt. пишите если нужно помочь с выбором!",
    },
]


class CommunityManager:
    """Менеджер сообщества VK"""
    
    def __init__(self):
        self.greeted_users = set()  # ID приветствованных пользователей
        self.comment_count = 0
        self.banned_count = 0
    
    def handle_new_member(self, user_id: int, user_name: str = None) -> str or None:
        """Обработка нового участника сообщества"""
        if not WELCOME_NEW_MEMBERS:
            return None
        
        if user_id in self.greeted_users:
            return None
        
        self.greeted_users.add(user_id)
        
        greeting = generate_greeting(user_name)
        welcome = random.choice(WELCOME_MESSAGES)
        
        return f"{greeting}\n{welcome}"
    
    def handle_comment(self, comment_text: str, user_name: str = None) -> str or None:
        """Обработка комментария к посту"""
        
        # Проверка на спам/запрещённые слова
        moderation_result = self.moderate_comment(comment_text)
        if moderation_result == "delete":
            self.banned_count += 1
            return None  # Комментарий будет удалён модератором
        elif moderation_result == "ignore":
            return None  # Не отвечаем на спам
        
        self.comment_count += 1
        
        # Проверяем FAQ
        faq_reply = self._check_faq(comment_text)
        if faq_reply:
            return faq_reply
        
        # Общий ответ
        if REPLY_TO_COMMENTS:
            return generate_reply(comment_text, user_name)
        
        return None
    
    def handle_dm(self, message: str, user_name: str = None) -> str:
        """Обработка личного сообщения"""
        # Проверяем FAQ
        faq_reply = self._check_faq(message)
        if faq_reply:
            return faq_reply
        
        # Общий ответ
        from human import generate_dm_reply
        return generate_dm_reply(message, user_name)
    
    def moderate_comment(self, text: str) -> str:
        """Модерация комментария
        
        Returns:
            "ok" — комментарий нормальный
            "ignore" — не отвечать (спам/реклама)
            "delete" — удалить (оскорбления/запрещёнка)
        """
        text_lower = text.lower()
        
        # Запрещённые слова
        for word in BANNED_WORDS:
            if word.lower() in text_lower:
                return "delete"
        
        # Спам-паттерны
        spam_patterns = [
            r"https?://\S+\.(ru|com|net|org).*/casino",
            r"https?://\S+\.(ru|com|net|org).*/bet",
            r"заработай.*дома",
            r"подработка.*дома",
            r"18\+",
            r"crypto.*без.*вложений",
        ]
        
        for pattern in spam_patterns:
            if re.search(pattern, text_lower):
                return "ignore"
        
        # Слишком короткие комментарии (бессмысленные)
        if len(text.strip()) < 2:
            return "ignore"
        
        return "ok"
    
    def _check_faq(self, text: str) -> str or None:
        """Проверяет текст на соответствие FAQ"""
        text_lower = text.lower()
        
        for faq in FAQ_RESPONSES:
            for pattern in faq["patterns"]:
                if re.search(pattern, text_lower):
                    return faq["reply"]
        
        return None
    
    def get_stats(self) -> dict:
        """Возвращает статистику модерации"""
        return {
            "comments_replied": self.comment_count,
            "users_greeted": len(self.greeted_users),
            "spam_blocked": self.banned_count,
        }


if __name__ == "__main__":
    # Тестирование
    manager = CommunityManager()
    
    print("=" * 50)
    print("🧪 Тест CommunityManager")
    print("=" * 50)
    
    # Тест приветствия
    print("\n--- Приветствие нового участника ---")
    msg = manager.handle_new_member(123, "Антон")
    print(msg)
    
    # Тест FAQ
    print("\n--- FAQ: сколько стоит? ---")
    reply = manager.handle_comment("а сколько стоит ваша работа?")
    print(reply)
    
    # Тест вопроса
    print("\n--- Вопрос ---")
    reply = manager.handle_comment("как можно выучить python?")
    print(reply)
    
    # Тест модерации
    print("\n--- Модерация ---")
    print(f"Нормальный коммент: {manager.moderate_comment('отличная статья!')}")
    print(f"Спам: {manager.moderate_comment('заработай 500к дома без вложений!')}")
    
    # Статистика
    print("\n--- Статистика ---")
    print(manager.get_stats())
