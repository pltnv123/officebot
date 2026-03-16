# Социальные функции OfficeBot

> Дата: 2026-03-17
> Назначение: Дизайн социальных функций (друзья, score, бонусы, совместная работа)

---

## Концепция

OfficeBot — не просто личный помощник. Это **социальная платформа**, где пользователи:
- Добавляют друзей
- Соревнуются (score, рейтинг)
- Получают бонусы
- Работают совместно в комнатах

**Философия:** «Мы зарабатываем вместе и развиваемся вместе».

---

## 1. Система друзей

### Добавление друзей

| Метод | Описание |
|-------|----------|
| **По username** | Поиск по @username OfficeBot |
| **По QR-коду** | Сканирование QR в приложении |
| **Через Telegram** | Импорт контактов из Telegram |
| **По ссылке** | Генерация пригласительной ссылки |

### Модель данных

```typescript
interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;          // Приветственное сообщение
  createdAt: Date;
}

interface Friend {
  userId: string;
  friendId: string;
  status: 'active' | 'blocked';
  since: Date;
  interactions: number;      // Количество взаимодействий
}
```

### Статусы друга

| Статус | Иконка | Описание |
|--------|--------|----------|
| **Online** | 🟢 | В приложении сейчас |
| **Away** | 🟡 | Был недавно (< 30 мин) |
| **In Room** | 🔵 | В конкретной комнате (видно какую) |
| **Offline** | ⚫ | Не в сети |

### UI — Друзья

```
┌──────────────────────────────────────┐
│  👥 Друзья (12)     [Поиск] [+ Добавить]│
├──────────────────────────────────────┤
│  🟢 @alex_dev       В WORKSHOP       │
│  🔵 @maria_pm       В BOARD ROOM     │
│  🟢 @dmitry_123     В INBOX          │
│  🟡 @olga_design    Была 15 мин назад│
│  ⚫ @ivan_ceo       2 часа назад     │
│  ⚫ @kate_hr        Вчера            │
│  ─────────────────────────────────── │
│  ⏳ Запросы (2)                      │
│  @new_user1  [Принять] [Отклонить]   │
│  @new_user2  [Принять] [Отклонить]   │
└──────────────────────────────────────┘
```

---

## 2. Score (Очки)

### Что такое Score

Score — это **числовой рейтинг** активности и достижений пользователя. Не просто «очки» — это **репутация в системе**.

### Начисление очков

| Действие | Очков | Лимит |
|----------|-------|-------|
| **Завершить задачу** | +10 | Безлимит |
| **Получить одобрение REVIEWER** | +5 | Безлимит |
| **Создать скрипт** | +25 | 5/день |
| **Помочь другу** | +15 | 10/день |
| **Пригласить друга** | +50 | Безлимит |
| **Ежедневный вход** | +5 | 1/день |
| **7 дней подряд** | +30 (бонус) | 1/неделю |
| **30 дней подряд** | +100 (бонус) | 1/месяц |
| **Создать комнату** | +10 | Безлимит |
| **Поделиться комнатой** | +20 | 3/день |
| **Успешный билд** | +5 | Безлимит |
| **Высокий QA-рейтинг** | +15 | Безлимит |

### Штрафы

| Действие | Очков |
|----------|-------|
| Ошибка в продакшене | -20 |
| Отмена задачи (не завершённая) | -5 |
| Нарушение правил (модерация) | -100 |

### Уровни (Ranks)

| Уровень | Score | Название | Иконка |
|---------|-------|----------|--------|
| 0 | 0 | Новичок | 🐣 |
| 1 | 100 | Стажёр | 🐤 |
| 2 | 500 | Сотрудник | 🐥 |
| 3 | 1,500 | Специалист | 🦅 |
| 4 | 5,000 | Эксперт | 🦉 |
| 5 | 15,000 | Мастер | 🦁 |
| 6 | 50,000 | Легенда | 🐉 |
| 7 | 150,000 | Миф | 👑 |

### Рейтинговая доска (Leaderboard)

```
┌──────────────────────────────────────┐
│  🏆 Рейтинг этого месяца            │
├──────────────────────────────────────┤
│  🥇 @alex_dev       12,450  🦉 Expert│
│  🥈 @maria_pm       9,820   🦅 Spec │
│  🥉 @dmitry_123     8,100   🦅 Spec │
│  4.  @olga_design   6,200   🦅 Spec │
│  5.  @ivan_ceo      5,900   🦅 Spec │
│  ...                                │
│  47. Вы            1,250   🐥 Staff │
└──────────────────────────────────────┘
```

### Модель данных

```typescript
interface UserScore {
  userId: string;
  totalScore: number;          // Всего очков (не сбрасывается)
  monthlyScore: number;        // Очки за текущий месяц
  rank: number;                // Текущий уровень (0-7)
  streak: number;              // Текущая серия дней
  lastActivity: Date;
  breakdown: ScoreBreakdown;   // Детализация по категориям
}

interface ScoreBreakdown {
  tasksCompleted: number;
  scriptsCreated: number;
  friendsHelped: number;
  friendsInvited: number;
  daysActive: number;
  roomsCreated: number;
  buildsSuccessful: number;
}
```

---

## 3. Бонусы

### Типы бонусов

| Бонус | Условие | Награда |
|-------|---------|---------|
| **Daily Login** | Вход 7 дней подряд | 50 кредитов |
| **Weekly Warrior** | 7 дней активности за неделю | 100 кредитов + бейдж |
| **Script Master** | Создать 10 скриптов | 200 кредитов + роль в Discord |
| **Social Butterfly** | Пригласить 5 друзей | 300 кредитов + premium-комната |
| **Perfect Week** | Все задачи выполнены за неделю | 150 кредитов |
| **Early Adopter** | Быть в сервисе > 6 месяцев | 500 кредитов + special robot |
| **Top Performer** | Топ-10 в рейтинге за месяц | 1000 кредитов |

### Currency (Внутренняя валюта)

```
┌──────────────────────────────────────┐
│  💰 Баланс                          │
│  Кредиты: 1,250                     │
│  Бонусные: 500                      │
│  Всего: 1,750                       │
│                                     │
│  🎁 Что можно купить:              │
│  • Кастомный робот — 500 кредитов  │
│  • Premium комната — 300 кредитов  │
│  • Эксклюзивный скрипт — 200       │
│  • Аватарка-рамка — 100            │
│  • Тема оформления — 50            │
└──────────────────────────────────────┘
```

### Бонусная программа (партнёрская)

```
Пригласи друга → друг платит подписку → ты получаешь 20% от первого месяца

Приглашено 10 друзей → все платят → дополнительные 2,000 кредитов/месяц
```

---

## 4. Совместная работа

### Режимы совместной работы

#### 4.1 Co-op Room (Совместная комната)
- Владелец комнаты приглашает друзей
- Все видят одну и ту же 3D-сцену
- Агенты доступны всем участникам
- Чат внутри комнаты

#### 4.2 Watch Mode (Режим наблюдения)
- Друг смотрит, как ты работаешь
- Не может взаимодействовать с агентами
- Может комментировать в чате
- Полезно для менторства

#### 4.3 Pair Work (Парная работа)
- Два пользователя + один агент
- Оба видят доску и могут двигать задачи
- Агент отвечает обоим

### Техническая реализация совместной работы

```typescript
// Real-time collaboration via WebSocket
class CollaborationService {
  private rooms: Map<string, CollaborationRoom> = new Map();
  
  async joinRoom(userId: string, roomId: string, mode: 'edit' | 'watch'): Promise<void> {
    const room = this.rooms.get(roomId) || await this.loadRoom(roomId);
    
    // Проверить права доступа
    if (!await this.canAccess(userId, roomId)) {
      throw new Error('Access denied');
    }
    
    // Добавить участника
    room.participants.push({ userId, mode, cursor: null });
    this.rooms.set(roomId, room);
    
    // Отправить state новому участнику
    await this.sendFullState(userId, room);
    
    // Уведомить остальных
    this.broadcast(roomId, {
      type: 'USER_JOINED',
      userId,
      mode,
    }, exclude: userId);
  }
  
  // Синхронизация действий
  async broadcastAction(roomId: string, action: Action): void {
    // 1. Применить действие к state
    const room = this.rooms.get(roomId);
    room.state = this.applyAction(room.state, action);
    
    // 2. Отправить всем участникам
    this.broadcast(roomId, {
      type: 'ACTION',
      action,
      appliedBy: action.userId,
    });
    
    // 3. Сохранить в историю
    await this.saveAction(roomId, action);
  }
}
```

```csharp
// Unity — синхронизация курсоров и выделений
public class CollaborationController : MonoBehaviour
{
    private Dictionary<string, CursorIndicator> cursors = new();
    
    public void OnRemoteCursor(string userId, Vector3 position, string color)
    {
        if (!cursors.ContainsKey(userId))
        {
            cursors[userId] = CreateCursorIndicator(color);
        }
        cursors[userId].transform.position = position;
    }
    
    public void OnRemoteHighlight(string userId, string objectId)
    {
        // Подсветить объект, на который смотрит другой пользователь
        Highlight(objectId, GetColor(userId));
    }
}
```

### UI — Совместная работа

```
┌──────────────────────────────────────────┐
│  🏢 BOARD ROOM   [Режим: Редактирование]│
│  Участники: 👤 @you (вы) 👤 @alex      │
├──────────────────────────────────────────┤
│                                          │
│   ┌────────────────────────────────┐     │
│   │         3D СЦЕНА              │     │
│   │                                │     │
│   │    [PLANNER]    [REVIEWER]    │     │
│   │        🤖          🤖         │     │
│   │                                │     │
│   │    🖱️ ← курсор @alex          │     │
│   └────────────────────────────────┘     │
│                                          │
│   ┌────────────────────────────────┐     │
│   │  💬 Чат                        │     │
│   │  @you: Привет! Давай план     │     │
│   │  @alex: 👍 Согласен            │     │
│   │  [  сообщение...            ]  │     │
│   └────────────────────────────────┘     │
└──────────────────────────────────────────┘
```

---

## 5. Achievements (Достижения)

### Бейджи

| Бейдж | Условие | Редкость |
|-------|---------|----------|
| 🎯 **First Task** | Первая выполненная задача | Обычный |
| 🤝 **Team Player** | Работа в команде 10 раз | Обычный |
| 📜 **Script Writer** | 5 скриптов создано | Обычный |
| ⭐ **Perfect Score** | Все задачи за неделю одобрены | Редкий |
| 🏗️ **Builder** | Успешных билдов > 100 | Редкий |
| 🧠 **Mastermind** | Score > 10,000 | Редкий |
| 🌟 **Influencer** | Пригласил 20 друзей | Эпический |
| 🐉 **Dragon** | Score > 50,000 | Эпический |
| 👑 **Crown** | Топ-1 на месяц | Легендарный |
| 🤖 **AI Whisperer** | Все типы агентов использованы | Легендарный |

### Коллекция

```
┌──────────────────────────────────────┐
│  🏅 Достижения (14/42)              │
├──────────────────────────────────────┤
│  ✅ 🎯 First Task                   │
│  ✅ 🤝 Team Player                  │
│  ✅ 📜 Script Writer                │
│  ⬜ ⭐ Perfect Score (3/5)          │
│  ✅ 🏗️ Builder                      │
│  ⬜ 🧠 Mastermind (1250/10000)     │
│  ...                                │
└──────────────────────────────────────┘
```

---

## 6. Модель данных (полная)

```typescript
// Социальный профиль пользователя
interface SocialProfile {
  userId: string;
  displayName: string;
  avatar: string;
  score: UserScore;
  rank: Rank;
  badges: Badge[];
  friends: Friend[];
  achievements: Achievement[];
  stats: UserStats;
}

// Общая статистика
interface UserStats {
  totalTasks: number;
  completedTasks: number;
  scriptsCreated: number;
  friendsCount: number;
  roomsCreated: number;
  daysActive: number;
  avgApprovalRate: number;     // Средний процент одобрения
  longestStreak: number;
}

// Событие для аналитики
interface SocialEvent {
  userId: string;
  type: string;                // "task_completed", "friend_invited", etc.
  value: number;
  metadata: Record<string, any>;
  timestamp: Date;
}
```

---

## 7. Монетизация социальных функций

| Функция | Бесплатно | Premium |
|---------|-----------|---------|
| Друзья | До 10 | Безлимит |
| Совместные комнаты | 1 | 10 |
| Бейджи | Все | Все + эксклюзивные |
| Leaderboard | Виден топ-100 | Виден топ-1000 |
| Профиль | Базовый | Кастомный фон, анимации |
| Приглашения | 5/неделю | Безлимит |

---

## 8. Roadmap

| Фаза | Функциональность |
|------|------------------|
| **Alpha** | Профиль, базовый score, статистика |
| **Beta** | Друзья, приглашения, leaderboard |
| **V1.0** | Бонусы, бейджи, совместные комнаты |
| **V1.5** | Маркетплейс, команды, турниры |
