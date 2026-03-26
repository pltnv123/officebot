const { promises: fs } = require('fs');
const path = require('path');
(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const QUEUE_PATH = path.join(ROOT, 'task_queue.json');
  console.log('watchdog: loading queue');
  let data = { tasks: [] };
  try {
    const raw = await fs.readFile(QUEUE_PATH, 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('watchdog: no queue file, nothing to do');
      return;
    }
    console.error('watchdog: failed to read queue', err.message);
    return;
  }
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const now = Date.now();
  const thresholdMs = 15 * 60 * 1000;
  let changed = false;
  for (const task of tasks) {
    if (task.status !== 'in_progress') continue;
    if (!task.started_at) continue;
    const started = Date.parse(task.started_at);
    if (Number.isNaN(started)) continue;
    if (now - started <= thresholdMs) continue;
    changed = true;
    task.status = 'failed';
    task.error = 'watchdog: stuck in_progress timeout';
    task.completed_at = new Date().toISOString();
    console.log('watchdog: marking stuck task', task.id, task.title);
  }
  if (changed) {
    await fs.writeFile(QUEUE_PATH, JSON.stringify({ tasks }, null, 2), 'utf8');
    console.log('watchdog: queue updated');
  } else {
    console.log('watchdog: no stuck tasks');
  }
})();