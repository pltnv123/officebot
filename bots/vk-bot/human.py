"""
Human-like модуль для VK бота.
Делает общение естественным и живым.
"""

import random
import time
from config import MESSAGE_DELAY_MIN, MESSAGE_DELAY_MAX, MAX_EMOJI_PER_MESSAGE

# === Русский сленг ===
SLANG_MAP = {
    "здравствуйте": "привет",
    "добрый день": "привет",
    "доброе утро": "привет",
    "до свидания": "пока",
    "спасибо": "спс",
    "благодарю": "спс",
    "пожалуйста": "не за что",
    "конечно": "конечно",
    "разумеется": "конечно",
    "сделано": "го",
    "выполнено": "го",
    "необходимо": "надо",
    "требуется": "надо",
    "является": "это",
    "представляет": "это",
    "осуществляется": "делается",
}

# === Эмодзи-словарь ===
EMOJI_MAP = {
    "AI": "🤖",
    "нейросеть": "🧠",
    "автоматизация": "⚡",
    "бизнес": "💼",
    "идея": "💡",
    "успех": "🎉",
    "вопрос": "❓",
    "совет": "📌",
    "кейс": "📊",
    "статья": "📝",
    "ссылка": "🔗",
    "важно": "❗",
    "хорошо": "✅",
    "плохо": "❌",
    "рост": "📈",
    "падение": "📉",
    "деньги": "💰",
    "время": "⏰",
}

# === Паузы и задержки ===
def random_pause():
    """Случайная пауза перед отправкой сообщения (имитация набора текста)"""
    time.sleep(random.uniform(MESSAGE_DELAY_MIN, MESSAGE_DELAY_MAX))


def short_pause():
    """Короткая пауза (0.5-1.5 сек)"""
    time.sleep(random.uniform(0.5, 1.5))


# === Трансформация текста ===
def casual_text(text: str) -> str:
    """Превращает формальный текст в casual"""
    result = text
    for formal, casual in SLANG_MAP.items():
        result = result.replace(formal, casual)
    return result


def add_emoji(text: str, keyword: str = None) -> str:
    """Добавляет эмодзи к тексту если уместно"""
    if keyword and keyword in EMOJI_MAP:
        emoji = EMOJI_MAP[keyword]
        if text.count(emoji) < MAX_EMOJI_PER_MESSAGE:
            return f"{text} {emoji}"
    
    # Случайный эмодзи в конце (20% шанс)
    if random.random() < 0.2:
        emojis = ["👍", "💪", "🎯", "✨", "🔥"]
        return f"{text} {random.choice(emojis)}"
    
    return text


def personalize(text: str, user_name: str = None) -> str:
    """Персонализирует сообщение"""
    if user_name:
        # Иногда (30% шанс) добавляем обращение
        if random.random() < 0.3:
            return f"{user_name}, {text.lower()}"
    return text


def make_casual_post(text: str) -> str:
    """Превращает черновик поста в casual стиль VK"""
    # Делаем текст менее формальным
    result = casual_text(text)
    
    # Убираем точки в конце (VK-стиль)
    lines = result.split('\n')
    cleaned = []
    for line in lines:
        line = line.strip()
        if line and line.endswith('.'):
            line = line[:-1]
        cleaned.append(line)
    
    result = '\n'.join(cleaned)
    
    # Добавляем эмодзи к ключевым словам
    for keyword in ["AI", "нейросеть", "автоматизация", "идея", "успех", "вопрос"]:
        if keyword in result and keyword in EMOJI_MAP:
            emoji = EMOJI_MAP[keyword]
            if result.count(emoji) < MAX_EMOJI_PER_MESSAGE:
                result = result.replace(keyword, f"{keyword} {emoji}", 1)
    
    return result


# === Генераторы ответов ===
def generate_greeting(user_name: str = None) -> str:
    """Генерирует приветствие"""
    greetings = [
        "Привет всем!",
        "Всем привет 👋",
        "Йоу!",
        "Хей!",
        "Приветики!",
    ]
    
    greeting = random.choice(greetings)
    
    if user_name:
        greeting = f"{user_name}, {greeting.lower()}"
    
    return greeting


def generate_reply(comment_text: str, user_name: str = None) -> str:
    """Генерирует ответ на комментарий"""
    
    comment_lower = comment_text.lower()
    
    # Контекстные ответы
    if any(q in comment_lower for q in ["?", "как", "какой", "что", "где", "когда"]):
        replies = [
            "хороший вопрос! давайте разберёмся",
            "интересно, сам думал над этим",
            "да, это важная тема",
            "напишу подробнее в следующем посте",
        ]
    elif any(neg in comment_lower for neg in ["не", "плохо", "ужасно", "грустно"]):
        replies = [
            "понимаю, бывает такое",
            "держись, всё наладится!",
            "если нужна помощь — пиши в личку",
            "знаю эту боль 😅",
        ]
    elif any(pos in comment_lower for pos in ["класс", "супер", "спасибо", "отлично", "круто"]):
        replies = [
            "спс! рад что полезно 🙌",
            "спасибо за тёплые слова!",
            "это мотивирует двигаться дальше!",
            "окей, ещё больше контента тогда!",
        ]
    else:
        replies = [
            "согласен!",
            "точно, хорошая мысль",
            "интересно, давайте обсудим",
            "отличная точка зрения 👍",
            "подписался на это",
        ]
    
    reply = random.choice(replies)
    
    if user_name:
        reply = personalize(reply, user_name)
    
    return reply


def generate_dm_reply(message: str, user_name: str = None) -> str:
    """Генерирует ответ в личные сообщения"""
    msg_lower = message.lower()
    
    if any(g in msg_lower for g in ["привет", "хей", "здравствуй"]):
        return "Привет! Как дела? что интересует? 😊"
    
    elif any(t in msg_lower for t in ["услуг", "прайс", "стоим", "цена"]):
        return "ок, расскажи подробнее что нужно — посчитаем и скину прайс 👍"
    
    elif any(c in msg_lower for c in ["сотруднич", "партнёр", "合作"]):
        return "отлично! давай обсудим — напиши что предлагаешь"
    
    elif any(h in msg_lower for g in ["помоги", "посоветуй", "рекоменд"]):
        return "давай разберёмся! расскажи про свою задачу"
    
    elif any(f in msg_lower for f in ["спс", "спасибо", "благодар"]):
        return "не за что! если что — обращайся 💪"
    
    else:
        replies = [
            "понял, давай обсудим",
            "ок, интересная тема",
            "хорошо, что ещё?",
            "отлично, давай подробнее",
        ]
        return random.choice(replies)


# === Задержки для постов ===
def get_typing_delay(text_length: int) -> float:
    """Время 'набора' текста (имитация)"""
    base = 1.0
    per_char = 0.02
    return base + (text_length * per_char)
