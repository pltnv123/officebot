# WebStudio Task Tracker

Профессиональная система отслеживания задач с прогресс-барами, ETA и дашбордом.

## Возможности

- ✅ **Прогресс-бары** с визуальной индикацией (█░)
- ⏱️ **Таймеры** — elapsed time и ETA
- 📊 **Дашборд** — все активные и завершённые задачи
- 🎯 **Статусы** — pending, running, completed, failed
- 📈 **Статистика** — среднее время выполнения, успех/ошибки

## Быстрый старт

### Запуск smoke-теста с трекером

```bash
# Одиночный тест
node scripts/run-with-tracker.js webstudio-last-project-restore-smoke.js

# Несколько тестов
node scripts/run-with-tracker.js test1.js test2.js test3.js

# Все smoke-тесты
node scripts/run-with-tracker.js --all
```

### Демо-режим

```bash
node scripts/tracker-demo.js
```

## API

### Базовое использование

```javascript
const tracker = require('../backend/taskTracker');

// Создать задачу
const task = tracker.createTask({
  name: 'Building project',
  description: 'Starting build...',
  totalSteps: 5
});

// Начать выполнение
tracker.startTask(task.taskId);

// Обновлять прогресс
tracker.updateProgress(task.taskId, 0.4, 'Compiling...');

// Завершить
tracker.completeTask(task.taskId);

// Или с ошибкой
tracker.failTask(task.taskId, 'Connection timeout');
```

### Обёртка для async функций

```javascript
await tracker.withTaskTracking(async ({ updateProgress, setTotalSteps }) => {
  setTotalSteps(4);
  
  updateProgress(0.1, 'Initializing...');
  await doStep1();
  
  updateProgress(0.5, 'Processing...');
  await doStep2();
  
  updateProgress(0.9, 'Finalizing...');
  await doStep3();
  
  return { result: 'success' };
}, { name: 'My Task' });
```

### Дашборд

```javascript
// Вывод дашборда в консоль
console.log(tracker.renderDashboard());
```

Пример вывода:

```
╔══════════════════════════════════════════════════════════╗
║           📊 WEBSTUDIO TASK DASHBOARD                    ║
╠══════════════════════════════════════════════════════════╣
║  Active Tasks: 2                                         ║
╠──────────────────────────────────────────────────────────╣
║  🔄 [████████████████░░░░░░░░░░░░░░░░░░] 60% — Running tests
║     ├─ Elapsed: 12.3s | ETA: 8.2s
║     └─ Test 6/10                                          ║
║  🔄 [████████████████████████████████░░░░] 80% — Deploying
║     ├─ Elapsed: 5.1s | ETA: 1.3s
║     └─ Step 8/10                                          ║
╚══════════════════════════════════════════════════════════╝
```

## Статусы задач

| Статус | Иконка | Цвет | Описание |
|--------|--------|------|----------|
| `pending` | ⏳ | серый | Ожидает запуска |
| `running` | 🔄 | циан | Выполняется |
| `completed` | ✅ | зелёный | Успешно завершено |
| `failed` | ❌ | красный | Ошибка |
| `cancelled` | ⏹️ | серый | Отменено |

## Статистика

```javascript
const stats = tracker.getStats();
console.log(stats);
// {
//   total: 10,
//   active: 2,
//   pending: 1,
//   completed: 6,
//   failed: 1,
//   avgDuration: 15420 // ms
// }
```

## Интеграция с OpenClaw TUI

Для отображения прогресса в TUI OpenClaw:

1. Запускайте smoke-тесты через `run-with-tracker.js`
2. Используйте `process` tool для polling с выводом дашборда
3. Для длительных задач создавайте под-агенты с трекером

### Пример для OpenClaw

```javascript
// В OpenClaw skill или скрипте
const { exec } = require('child_process');

exec('node scripts/run-with-tracker.js --all', (error, stdout, stderr) => {
  console.log(stdout);
  if (error) console.error(stderr);
});
```

## Утилиты

### Форматирование времени

```javascript
tracker.formatDuration(1500);    // "1.5s"
tracker.formatDuration(65000);   // "1m 5s"
tracker.formatDuration(500);     // "500ms"
```

### Очистка старых задач

```javascript
// Удалить завершённые задачи старше 60 минут
tracker.cleanupOldTasks(60);
```

## Конфигурация

```javascript
tracker.CONFIG = {
  barWidth: 40,           // Ширина прогресс-бара
  updateIntervalMs: 100,  // Интервал обновления
  showETA: true,          // Показывать ETA
  showElapsed: true,      // Показывать elapsed time
  colors: { ... }         // ANSI цвета
};
```

## Примеры

### Smoke-тест с прогрессом

```javascript
const tracker = require('../backend/taskTracker');

async function runSmokeTest() {
  await tracker.withTaskTracking(async ({ updateProgress }) => {
    updateProgress(0.1, 'Opening browser...');
    await browser.open('/webstudio/demo');
    
    updateProgress(0.3, 'Generating script...');
    await generateScript();
    
    updateProgress(0.6, 'Executing...');
    await executeScript();
    
    updateProgress(0.9, 'Validating...');
    await validate();
    
    updateProgress(1.0, 'Complete!');
  }, { name: 'webstudio-script-smoke' });
}
```

### Параллельные задачи

```javascript
const task1 = tracker.createTask({ name: 'Build frontend', totalSteps: 10 });
const task2 = tracker.createTask({ name: 'Build backend', totalSteps: 10 });

tracker.startTask(task1.taskId);
tracker.startTask(task2.taskId);

// Обновлять обе задачи параллельно
const interval = setInterval(() => {
  tracker.updateProgress(task1.taskId, task1.progress + 0.1);
  tracker.updateProgress(task2.taskId, task2.progress + 0.1);
  console.log(tracker.renderDashboard());
  
  if (task1.progress >= 1 && task2.progress >= 1) {
    clearInterval(interval);
  }
}, 500);
```

## Best Practices

1. **Всегда завершайте задачи** — вызывайте `completeTask` или `failTask`
2. **Обновляйте прогресс регулярно** — каждые 0.5-2 секунды для UX
3. **Используйте описательные имена** — `Build frontend` вместо `Task 1`
4. **Указывайте totalSteps** — для точного расчёта прогресса
5. **Очищайте старые задачи** — `cleanupOldTasks(60)` раз в час

## Отладка

```javascript
// Включить подробный вывод
tracker.CONFIG.debug = true;

// Получить все задачи
const allTasks = Array.from(tracker.tasks.values());

// Найти задачу по имени
const buildTask = allTasks.find(t => t.name === 'Build project');
```
