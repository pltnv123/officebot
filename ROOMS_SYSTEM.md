# Система комнат OfficeBot

> Дата: 2026-03-17
> Назначение: Дизайн и техническая реализация системы комнат

---

## Концепция

Комната в OfficeBot — это **контекстное пространство**, в котором работают агенты. Каждая комната определяет:
- Какие агенты доступны
- Какие инструменты и скрипты доступны
- Какой контекст задач
- Какие друзья/коллеги могут подключиться

**Аналогия:** представь офисное здание. У тебя есть комната бухгалтерии, комната разработки, переговорная, комната отдыха. В каждой — свои инструменты, свои правила, свой контекст.

---

## Базовые комнаты (из коробки)

### 1. 📋 INBOX (Входящие)
**Назначение:** Принятие задач, общение с агентами

| Параметр | Значение |
|----------|----------|
| Агенты | PLANNER, CHIEF |
| Скрипты | — |
| Доступ | Только пользователь |
| Цветовая схема | Синяя |

Дефолтная стартовая комната. Сюда пользователь отправляет задачи и получает ответы.

---

### 2. 📐 PLANNING (Планирование)
**Назначение:** Планирование задач, создание планов, декомпозиция

| Параметр | Значение |
|----------|----------|
| Агенты | PLANNER |
| Скрипты | plan_generator, task_decomposer |
| Доступ | Только пользователь |
| Цветовая схема | Зелёная |

Агент PLANNER работает здесь. Доска с планом отображается на стене.

---

### 3. 🔨 WORKSHOP (Мастерская)
**Назначение:** Код, реализация, создание

| Параметр | Значение |
|----------|----------|
| Агенты | WORKER, BUILDER |
| Скрипты | code_editor, git_sync, build_runner |
| Доступ | Только пользователь |
| Цветовая схема | Оранжевая |

Где WORKER пишет код. Терминал, редактор, файловая система.

---

### 4. 🔍 REVIEW ROOM (Обзор)
**Назначение:** Код-ревью, QA, визуальная проверка

| Параметр | Значение |
|----------|----------|
| Агенты | REVIEWER, VREVIEWER |
| Скрипты | screenshot_tool, diff_viewer |
| Доступ | Только пользователь |
| Цветовая схема | Фиолетовая |

REVIEWER проверяет код, VREVIEWER — визуал. Доска с результатами ревью.

---

### 5. 📦 SCRIPTS ROOM (Комната скриптов)
**Назначение:** Полезные скрипты, автоматизации, готовые решения

| Параметр | Значение |
|----------|----------|
| Агенты | SCRIPT_AGENT |
| Скрипты | Все доступные скрипты |
| Доступ | Пользователь + друзья (по желанию) |
| Цветовая схема | Жёлтая |

**Это комната из ответа Антона: «комната со скриптами».**

Содержит:
- Библиотеку готовых скриптов
- Маркетплейс пользовательских скриптов
- Автоматизации (cron, триггеры, webhook-и)

---

### 6. 🏢 BOARD ROOM (Совещание)
**Назначение:** Совместная работа с друзьями/коллегами

| Параметр | Значение |
|----------|----------|
| Агенты | Все (по выбору) |
| Скрипты | whiteboard, voice_chat |
| Доступ | Пользователь + приглашённые друзья |
| Цветовая схема | Красная |

---

### 7. ⚙️ SETTINGS (Настройки)
**Назначение:** Настройка роботов, комнат, профиля

| Параметр | Значение |
|----------|----------|
| Агенты | CONFIG_AGENT |
| Скрипты | — |
| Доступ | Только пользователь |
| Цветовая схема | Серая |

---

## Пользовательские комнаты

### Принцип
Пользователь **может создавать свои комнаты**.

### Как это работает UI

```
┌─────────────────────────────────────────┐
│  + Новая комната                        │
│  ┌─────────────────────────────────┐    │
│  │ Название: [Мой маркетинг   ]   │    │
│  │ Цвет: 🔴 🟢 🔵 🟡 🟣          │    │
│  │ Иконка: 📊 💼 🎯 📈           │    │
│  │ Шаблон:                         │    │
│  │  ○ Пустая                        │    │
│  │  ○ Проект                        │    │
│  │  ○ Отдел                         │    │
│  │  ○ Хобби                         │    │
│  │  ○ Кастомный                     │    │
│  │ Агенты: [+ добавить]             │    │
│  │  ☐ PLANNER  ☐ WORKER            │    │
│  │  ☐ REVIEWER ☐ SCRIPT_AGENT      │    │
│  │  ☐ [кастомный агент]            │    │
│  │ Доступ:                          │    │
│  │  ○ Только я                      │    │
│  │  ○ Друзья                        │    │
│  │  ○ Все                           │    │
│  │                                   │    │
│  │       [Создать] [Отмена]         │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Шаблоны пользовательских комнат

| Шаблон | Описание | Агенты по умолчанию |
|--------|----------|---------------------|
| **Пустая** | Ничего не настроено | Нет |
| **Проект** | Для работы над проектом | PLANNER, WORKER, REVIEWER |
| **Отдел** | Корпоративный отдел | Все агенты |
| **Хобби** | Личные интересы | SCRIPT_AGENT |
| **Кастомный** | Полная настройка | Выбирает пользователь |

### Правила создания

1. **Минимум 1, максимум 20** комнат на пользователя
2. **Название** — до 30 символов, уникальное
3. **Цвет и иконка** — выбираются из набора
4. **Агенты** — минимум 0 (пустая), максимум 5
5. **Доступ** — приватная по умолчанию

---

## Техническая реализация

### Data Model

```typescript
// Room entity
interface Room {
  id: string;                    // UUID
  userId: string;                // Владелец
  name: string;                  // "Мой маркетинг"
  slug: string;                  // "moj-marketing" (для URL)
  color: string;                 // "#FF6B6B"
  icon: string;                  // "📊"
  template: 'empty' | 'project' | 'department' | 'hobby' | 'custom';
  agents: AgentConfig[];         // Агенты в комнате
  access: RoomAccess;            // Кто имеет доступ
  state: RoomState;              // Текущее состояние
  createdAt: Date;
  updatedAt: Date;
}

// Агент в комнате
interface AgentConfig {
  agentId: string;               // "PLANNER", "WORKER" или кастомный
  role: string;                  // Роль в комнате
  enabled: boolean;
  config: Record<string, any>;   // Кастомные настройки
}

// Доступ к комнате
interface RoomAccess {
  visibility: 'private' | 'friends' | 'public';
  allowedUsers: string[];        // ID пользователей с доступом
  allowInvites: boolean;         // Может ли владелец приглашать
}

// Состояние комнаты
interface RoomState {
  board: BoardState;             // Состояние доски
  files: FileReference[];        // Файлы в комнате
  history: Action[];             // История действий
  lastActivity: Date;
}
```

### Database Schema (PostgreSQL)

```sql
-- Комнаты
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(30) NOT NULL,
    slug VARCHAR(30) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6C5CE7',
    icon VARCHAR(10) NOT NULL DEFAULT '📋',
    template VARCHAR(20) NOT NULL DEFAULT 'empty',
    visibility VARCHAR(10) NOT NULL DEFAULT 'private',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

-- Агенты в комнатах
CREATE TABLE room_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Доступ к комнатам
CREATE TABLE room_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    permission VARCHAR(10) NOT NULL DEFAULT 'view', -- view, edit, admin
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);
```

### Room Manager Service

```typescript
class RoomManager {
  // Создание комнаты
  async createRoom(userId: string, dto: CreateRoomDto): Promise<Room> {
    // 1. Проверить лимит
    const count = await this.countUserRooms(userId);
    if (count >= 20) throw new Error('Room limit reached (max 20)');
    
    // 2. Проверить уникальность slug
    const slug = this.slugify(dto.name);
    if (await this.slugExists(userId, slug)) {
      throw new Error('Room with this name already exists');
    }
    
    // 3. Создать комнату
    const room = await this.roomRepo.create({
      userId,
      name: dto.name,
      slug,
      color: dto.color || '#6C5CE7',
      icon: dto.icon || '📋',
      template: dto.template || 'empty',
      visibility: 'private',
    });
    
    // 4. Применить шаблон
    if (dto.template !== 'empty') {
      await this.applyTemplate(room.id, dto.template);
    }
    
    // 5. Добавить агентов
    if (dto.agents?.length) {
      await this.addAgents(room.id, dto.agents);
    }
    
    // 6. Создать Docker-контейнер для комнаты
    await this.provisionContainer(room);
    
    return room;
  }
  
  // Переключение комнаты (в Unity)
  async switchRoom(userId: string, roomId: string): Promise<RoomState> {
    const room = await this.getRoomWithAccess(userId, roomId);
    
    // Загрузить состояние комнаты
    const state = await this.loadRoomState(roomId);
    
    // Активировать агентов комнаты
    await this.activateAgents(room.agents);
    
    // Отправить Unity команду на смену сцены
    await this.sendUnityCommand(userId, 'LOAD_ROOM', {
      roomId,
      scene: room.template,
      color: room.color,
      agents: room.agents,
    });
    
    return state;
  }
}
```

### Unity Integration

```csharp
// RoomSceneManager.cs
public class RoomSceneManager : MonoBehaviour
{
    [SerializeField] private Camera roomCamera;
    [SerializeField] private Light ambientLight;
    [SerializeField] private Transform boardAnchor;
    
    // Смена комнаты
    public async void LoadRoom(RoomData data)
    {
        // 1. Изменить цвет освещения
        ambientLight.color = ColorUtility.ParseHtmlString(data.color);
        
        // 2. Загрузить декор комнаты (по шаблону)
        var decor = LoadRoomDecor(data.template);
        await InstantiateDecor(decor);
        
        // 3. Расставить агентов
        foreach (var agent in data.agents)
        {
            var robot = await RobotFactory.Create(agent);
            robot.transform.position = GetAgentPosition(agent.role);
            robot.Animate("idle");
        }
        
        // 4. Настроить доску
        boardAnchor.GetComponent<BoardController>()
            .SetColumns(GetBoardColumns(data.template));
        
        // 5. Камера — плавный переход
        StartCoroutine(TransitionCamera(data.template));
    }
    
    // Шаблоны декора
    private RoomDecor LoadRoomDecor(string template)
    {
        return template switch
        {
            "inbox" => new RoomDecor
            {
                floor = "tile_bright",
                walls = "whiteboard",
                furniture = ["desk", "chair", "coffee_machine"],
            },
            "workshop" => new RoomDecor
            {
                floor = "industrial",
                walls = "brick",
                furniture = ["workbench", "tool_wall", "server_rack"],
            },
            "scripts" => new RoomDecor
            {
                floor = "neon_grid",
                walls = "screen_wall",
                furniture = ["terminal_desk", "floating_screens"],
            },
            _ => new RoomDecor { floor = "tile_bright", walls = "white" },
        };
    }
}
```

---

## Схема навигации

```
┌───────────────────────────────────────────┐
│             NAVIGATION BAR                │
│  📋INBOX 📐PLAN 🔨WORK 🔍REVIEW 📦SCRIPTS│
│  ─────────────────────────────────────    │
│  🔴 Мой маркетинг  🟢 Проект X  +       │
│  (пользовательские комнаты справа)       │
└───────────────────────────────────────────┘
```

### UI схема (WebGL / Mobile)

```
┌────────────────────────────────────────────┐
│  ←  INBOX  (1)            [+ Новая комната]│
├────────────────────────────────────────────┤
│                                            │
│   ┌──────────────────────────────────┐     │
│   │                                  │     │
│   │        3D СЦЕНА КОМНАТЫ          │     │
│   │    (Unity WebGL viewport)        │     │
│   │                                  │     │
│   │   [PLANNER]  [CHIEF]            │     │
│   │        🤖         🤖             │     │
│   │                                  │     │
│   └──────────────────────────────────┘     │
│                                            │
│   ┌──────────────────────────────────┐     │
│   │  💬 Чат с агентами              │     │
│   │  [  Введите сообщание...     ]  │     │
│   └──────────────────────────────────┘     │
└────────────────────────────────────────────┘
```

---

## Правила и ограничения

| Правило | Значение |
|---------|----------|
| Макс. комнат на пользователя | 20 |
| Мин. агентов в комнате | 0 |
| Макс. агентов в комнате | 5 |
| Макс. друзей в комнате одновременно | 5 |
| Название комнаты | 1–30 символов, уникальное |
| Формат названия | Любые символы, slug генерируется автоматически |
| Удаление комнаты | Только владелец, подтверждение обязательно |
| Копирование комнаты | Можно клонировать чужую комнату (с разрешения) |

---

## Roadmap

| Фаза | Функциональность |
|------|------------------|
| **Alpha** | 5 базовых комнат, без пользовательских |
| **Beta** | Пользовательские комнаты (шаблоны), до 10 |
| **V1.0** | Кастомные комнаты, до 20, приглашения друзей |
| **V1.5** | Маркетплейс комнат-шаблонов, публичные комнаты |
