const { promises: fs } = require('fs');
const path = require('path');
(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const QUEUE_PATH = path.join(ROOT, 'task_queue.json');
  const STATUS_PATH = path.join(ROOT, 'engineering_status.json');
  let data = { tasks: [] };
  try {
    const raw = await fs.readFile(QUEUE_PATH, 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('queue read error', err.message);
    }
  }
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const pending = tasks.filter(t => t.status === 'pending');
  let oldestSeconds = 0;
  if (pending.length) {
    const oldest = pending.reduce((a, b) => {
      const at = Date.parse(a.created_at || a.started_at || 0);
      const bt = Date.parse(b.created_at || b.started_at || 0);
      return at <= bt ? a : b;
    });
    const oldestTime = Date.parse(oldest.created_at || oldest.started_at || 0) || 0;
    oldestSeconds = Math.floor((Date.now() - oldestTime) / 1000);
  }
  let status = {};
  try {
    const rawStatus = await fs.readFile(STATUS_PATH, 'utf8');
    status = JSON.parse(rawStatus);
  } catch {
    status = {};
  }
  status.queue_health = {
    timestamp: new Date().toISOString(),
    pendingCount: pending.length,
    oldestPendingSeconds: oldestSeconds,
    totalTasks: tasks.length,
  };
  await fs.writeFile(STATUS_PATH, JSON.stringify(status, null, 2), 'utf8');
  console.log('queue health', status.queue_health);
})();