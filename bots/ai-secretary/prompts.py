# prompts.py — Prompt templates for AI Secretary tasks

# System prompt for all tasks
SYSTEM_PROMPT = """Ты — AI Секретарь, профессиональный помощник.
Ты помогаешь пользователю с повседневными рабочими задачами:
- Составление писем
- Напоминания и расписание
- Заметки с совещаний
- Презентации и отчёты

Ты отвечаешь кратко, по делу и профессионально.
Если пользователь пишет на русском — отвечай на русском.
Если на английском — на английском.
Всегда будь вежлив и структурируй ответы."""

# Email drafting prompt
EMAIL_PROMPT = """Составь профессиональное письмо на основе следующей информации:
Тема/получатель: {subject}
Контекст от пользователя: {context}

Требования:
- Профессиональный деловой тон
- Чёткая структура: приветствие, суть, заключение
- Короткое и по делу
- Без лишней воды

Сформируй готовое письмо:"""

# Reminder prompt (confirmation/formatting)
REMINDER_PROMPT = """Пользователь хочет создать напоминание.
Информация: {info}
Время: {time}

Подтверди напоминание кратко и ясно.
Используй формат: "⏰ Напомню {time}: {task}"
Если время указано расплывчато, уточни:"""

# Schedule management prompt
SCHEDULE_PROMPT = """Пользователь хочет записать дело в расписание.
Дело: {event}
Время: {time}
Дополнительно: {extra}

Отформатируй запись в календаре:
📅 {date} | 🕐 {time}
📌 {event}
{notes}

Если есть конфликты с другими делами — предупреди."""

# Call/meeting notes prompt
NOTES_PROMPT = """Создай краткое резюме/анализ совещания на основе следующих заметок:
Тема: {title}
Заметки: {notes}

Структура:
1. 🎯 Цель совещания
2. 📋 Основные обсуждённые вопросы
3. ✅ Принятые решения
4. 📝 Следующие шаги и ответственные
5. ⏰ Дедлайны (если есть)

Будь кратким и конкретным:"""

# Presentation outline prompt
PRESENTATION_PROMPT = """Создай структуру презентации:
Тема: {topic}
Цель: {goal}
Длительность: {duration}
Целевая аудитура: {audience}

Создай план:
1. Заголовок слайда
2. Ключевые точки
3. Примеры/данные (если уместно)

Количество слайдов адаптируй под длительность."""

# Report generation prompt
REPORT_PROMPT = """Создай структуру отчёта:
Тип: {report_type}
Период: {period}
Тема: {topic}
Данные: {data}

Структура:
1. Резюме (Executive Summary)
2. Основные показатели
3. Анализ
4. Выводы
5. Рекомендации

Будь объективным и структурированным:"""

# General assistant prompt (fallback)
GENERAL_PROMPT = """Пользователь обратился с вопросом/задачей:
{message}

Ответь helpful и по существу. Если задача требует уточнения — задай вопрос."""


def get_prompt(task_type: str, **kwargs) -> tuple[str, str]:
    """
    Returns (system_prompt, user_prompt) for the given task type.
    """
    prompts = {
        "email": EMAIL_PROMPT,
        "remind": REMINDER_PROMPT,
        "schedule": SCHEDULE_PROMPT,
        "notes": NOTES_PROMPT,
        "presentation": PRESENTATION_PROMPT,
        "report": REPORT_PROMPT,
    }

    user_template = prompts.get(task_type, GENERAL_PROMPT)
    user_prompt = user_template.format(**kwargs) if kwargs else user_template

    return SYSTEM_PROMPT, user_prompt
