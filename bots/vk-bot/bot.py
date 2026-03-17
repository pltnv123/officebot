"""
VK Bot для сообщества pltnv AI
Основной файл бота
"""

import vk_api
from vk_api.bot_longpoll import VkBotLongPoll, VkBotEventType
from vk_api.utils import get_random_id
import logging
import time
import threading
from datetime import datetime, timedelta

from config import VK_TOKEN, GROUP_ID, LOG_LEVEL, LOG_FILE, SCHEDULE, POST_DELAY
from content_planner import ContentPlanner
from community_manager import CommunityManager
from human import random_pause, short_pause, generate_reply

# === Логирование ===
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("vk_bot")


class VKBot:
    """Основной класс VK бота"""
    
    def __init__(self):
        if not VK_TOKEN:
            log.error("VK_TOKEN не установлен! Добавьте токен в config.py")
            raise ValueError("VK_TOKEN required")
        
        # Авторизация
        self.vk_session = vk_api.VkApi(token=VK_TOKEN)
        self.vk = self.vk_session.get_api()
        self.longpoll = VkBotLongPoll(self.vk_session, GROUP_ID)
        
        # Компоненты
        self.planner = ContentPlanner()
        self.manager = CommunityManager()
        
        # Состояние
        self.running = False
        self.last_post_time = None
        self.posted_today = []
        
        log.info(f"Бот инициализирован для группы {GROUP_ID}")
    
    # === Публикация постов ===
    
    def post_text(self, text: str, owner_id: int = None) -> dict:
        """Публикация текстового поста"""
        if owner_id is None:
            owner_id = -GROUP_ID
        
        try:
            result = self.vk.wall.post(
                owner_id=owner_id,
                from_group=1,
                message=text,
                random_id=get_random_id(),
            )
            post_id = result["post_id"]
            log.info(f"Пост опубликован: wall-{abs(owner_id)}_{post_id}")
            return result
        except Exception as e:
            log.error(f"Ошибка публикации: {e}")
            return None
    
    def post_poll(self, question: str, options: list, owner_id: int = None) -> dict:
        """Публикация опроса"""
        if owner_id is None:
            owner_id = -GROUP_ID
        
        try:
            result = self.vk.wall.post(
                owner_id=owner_id,
                from_group=1,
                message=question,
                attachments="poll",
                poll={
                    "owner_id": owner_id,
                    "question": question,
                    "answers": options,
                    "multiple_answers": False,
                },
                random_id=get_random_id(),
            )
            post_id = result["post_id"]
            log.info(f"Опрос опубликован: wall-{abs(owner_id)}_{post_id}")
            return result
        except Exception as e:
            log.error(f"Ошибка публикации опроса: {e}")
            return None
    
    def pin_post(self, post_id: int, owner_id: int = None):
        """Закрепить пост"""
        if owner_id is None:
            owner_id = -GROUP_ID
        
        try:
            self.vk.wall.pin(
                owner_id=owner_id,
                post_id=post_id,
            )
            log.info(f"Пост {post_id} закреплён")
        except Exception as e:
            log.error(f"Ошибка закрепления: {e}")
    
    def schedule_post(self, post: dict):
        """Запланировать и опубликовать пост"""
        if post["type"] == "text":
            content = self.planner.format_post(post)
            self.post_text(content)
        elif post["type"] == "poll":
            self.post_poll(
                question=post["content"],
                options=post["options"],
            )
        
        self.posted_today.append({
            "time": datetime.now(),
            "post": post,
        })
    
    # === Обработка событий ===
    
    def handle_message_new(self, event):
        """Обработка нового личного сообщения"""
        msg = event.obj.message
        user_id = msg["from_id"]
        text = msg.get("text", "")
        
        if not text:
            return
        
        log.info(f"ЛС от {user_id}: {text[:50]}...")
        
        # Получаем имя пользователя
        user_name = self._get_user_name(user_id)
        
        # Отправляем "печатает..."
        self._set_typing(user_id)
        
        # Генерируем ответ
        random_pause()
        reply = self.manager.handle_dm(text, user_name)
        
        # Отправляем ответ
        self._send_message(user_id, reply)
    
    def handle_wall_reply_new(self, event):
        """Обработка нового комментария к посту"""
        reply = event.obj
        user_id = reply["from_id"]
        text = reply.get("text", "")
        post_id = reply["post_id"]
        
        if not text:
            return
        
        log.info(f"Комментарий от {user_id} к посту {post_id}: {text[:50]}...")
        
        user_name = self._get_user_name(user_id)
        
        # Модерация + ответ
        response = self.manager.handle_comment(text, user_name)
        
        if response:
            short_pause()
            self._reply_to_comment(post_id, user_id, response)
    
    def handle_group_join(self, event):
        """Обработка вступления нового участника"""
        user_id = event.obj.user_id
        user_name = self._get_user_name(user_id)
        
        log.info(f"Новый участник: {user_id}")
        
        welcome = self.manager.handle_new_member(user_id, user_name)
        if welcome:
            self._send_message(user_id, welcome)
    
    # === Вспомогательные методы ===
    
    def _send_message(self, user_id: int, text: str):
        """Отправить личное сообщение"""
        try:
            self.vk.messages.send(
                user_id=user_id,
                message=text,
                random_id=get_random_id(),
            )
        except Exception as e:
            log.error(f"Ошибка отправки сообщения {user_id}: {e}")
    
    def _reply_to_comment(self, post_id: int, user_id: int, text: str):
        """Ответить на комментарий"""
        try:
            self.vk.wall.createComment(
                owner_id=-GROUP_ID,
                post_id=post_id,
                message=text,
                from_group=1,
                random_id=get_random_id(),
            )
        except Exception as e:
            log.error(f"Ошибка ответа на комментарий: {e}")
    
    def _set_typing(self, user_id: int):
        """Показать 'печатает...'"""
        try:
            self.vk.messages.setActivity(
                user_id=user_id,
                type="typing",
            )
        except Exception:
            pass  # Не критично
    
    def _get_user_name(self, user_id: int) -> str:
        """Получить имя пользователя"""
        try:
            user = self.vk.users.get(user_ids=user_id)[0]
            return user.get("first_name", "")
        except Exception:
            return ""
    
    # === Расписание ===
    
    def _is_time_to_post(self, schedule_key: str) -> bool:
        """Проверить, время ли постить по расписанию"""
        target_time = SCHEDULE.get(schedule_key)
        if not target_time:
            return False
        
        now = datetime.now()
        hour, minute = map(int, target_time.split(":"))
        
        target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        # Уже постили сегодня в это время?
        for p in self.posted_today:
            if p["post"].get("time") == schedule_key:
                return False
        
        # Время наступило? (±2 минуты)
        delta = abs((now - target).total_seconds())
        return delta < 120
    
    def _check_schedule(self):
        """Проверить расписание и постить если нужно"""
        now = datetime.now()
        
        # Сброс дневных постов
        if now.hour == 0 and now.minute < 5:
            self.posted_today = []
        
        for slot in ["morning", "noon", "evening", "night"]:
            if self._is_time_to_post(slot):
                log.info(f"Время поста: {slot}")
                post = self.planner.get_post_for_time(
                    int(SCHEDULE[slot].split(":")[0])
                )
                post["time"] = slot
                self.schedule_post(post)
                time.sleep(POST_DELAY)
    
    # === Главный цикл ===
    
    def run(self):
        """Запуск бота"""
        log.info("🤖 Бот запущен!")
        self.running = True
        
        # Запускаем планировщик в отдельном потоке
        scheduler = threading.Thread(target=self._scheduler_loop, daemon=True)
        scheduler.start()
        
        # Основной цикл обработки событий
        for event in self.longpoll.listen():
            if not self.running:
                break
            
            try:
                if event.type == VkBotEventType.MESSAGE_NEW:
                    # Личные сообщения
                    if event.obj.message.get("peer_id") != event.obj.message.get("from_id"):
                        continue  # Пропускаем групповые чаты
                    self.handle_message_new(event)
                
                elif event.type == VkBotEventType.WALL_REPLY_NEW:
                    self.handle_wall_reply_new(event)
                
                elif event.type == VkBotEventType.GROUP_JOIN:
                    self.handle_group_join(event)
            
            except Exception as e:
                log.error(f"Ошибка обработки события: {e}")
                time.sleep(1)
    
    def _scheduler_loop(self):
        """Цикл планировщика постов"""
        while self.running:
            try:
                self._check_schedule()
            except Exception as e:
                log.error(f"Ошибка планировщика: {e}")
            time.sleep(30)  # Проверяем каждые 30 секунд
    
    def stop(self):
        """Остановка бота"""
        log.info("Остановка бота...")
        self.running = False


def main():
    """Точка входа"""
    print("=" * 50)
    print("🤖 pltnv AI — VK Bot")
    print("=" * 50)
    
    bot = VKBot()
    
    try:
        bot.run()
    except KeyboardInterrupt:
        bot.stop()
        print("\n👋 Бот остановлен")
    except Exception as e:
        log.error(f"Критическая ошибка: {e}")
        raise


if __name__ == "__main__":
    main()
