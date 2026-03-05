const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const { runOrchestrator, tickFirstDoingTask } = require('./taskOrchestrator');

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '1mb' }));

const ROOT = path.resolve(__dirname, '..');
const TASKS_PATH = path.join(ROOT, 'tasks.json');
const STATE_PATH = path.join(ROOT, 'state.json');
const WORLD_PATH = path.join(ROOT, '.world.json');
const UPDATE_SCRIPT = path.join(ROOT, 'update_state.sh');

function nowIso() {
  return new Date().toISOString();
}

async function readJsonSafe(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(p, data) {
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
}

function mkTaskId() {
  return 'TASK-' + Date.now();
}

function taskTemplate(title) {
  return {
    id: mkTaskId(),
    title,
    status: 'doing',
    estimate: 60,
    actual: 0,
    progress: 0,
    subtasks: [
      { title: 'Разбор и план', status: 'doing', estimate: 15, actual: 0, progress: 0 },
      { title: 'Реализация', status: 'todo', estimate: 30, actual: 0, progress: 0 },
      { title: 'Проверка', status: 'todo', estimate: 15, actual: 0, progress: 0 }
    ]
  };
}

async function rebuildState() {
  await new Promise((resolve, reject) => {
    const p = spawn('bash', [UPDATE_SCRIPT], { cwd: ROOT, stdio: 'ignore' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('update_state failed'))));
    p.on('error', reject);
  });
}

app.get('/health', async (_req, res) => {
  res.json({ ok: true, ts: nowIso() });
});

app.get('/api/state', async (_req, res) => {
  const state = await readJsonSafe(STATE_PATH, { tasks: [], bots: [], world: { toggles: {}, metrics: {} } });
  const world = await readJsonSafe(WORLD_PATH, { toggles: {}, metrics: {} });
  res.json({ ...state, world: state.world || world });
});

app.get('/api/ops/health', async (_req, res) => {
  const state = await readJsonSafe(STATE_PATH, {});
  const world = await readJsonSafe(WORLD_PATH, { toggles: {}, metrics: {} });
  const tasks = Array.isArray(state?.taskState?.tasks) ? state.taskState.tasks : [];
  const active = tasks.filter((t) => t?.status === 'doing').length;
  const done = tasks.filter((t) => t?.status === 'done').length;
  const recentDone = Array.isArray(state?.recentDone) ? state.recentDone.length : 0;
  const stateTs = Date.parse(state?.timestamp || '') || Date.now();
  const stateAgeSec = Math.max(0, Math.floor((Date.now() - stateTs) / 1000));
  const stateAgeHuman = stateAgeSec < 60
    ? `${stateAgeSec}s`
    : `${Math.floor(stateAgeSec / 60)}m ${stateAgeSec % 60}s`;

  const gatewayUp = Boolean(state?.gatewayUp);
  const stale = stateAgeSec > 120;

  res.json({
    ok: true,
    ts: nowIso(),
    gatewayUp,
    stale,
    mode: String(state?.mode || 'unknown'),
    stateTimestamp: String(state?.timestamp || ''),
    cpu: Number(state?.gatewayCpu || 0),
    load1: Number(state?.load1 || 0),
    stateAgeSec,
    stateAgeHuman,
    tasks: { active, done, total: tasks.length, recentDone },
    toggles: world?.toggles || {},
    metrics: world?.metrics || {},
  });
});

app.post('/api/tasks', async (req, res) => {
  const title = String(req.body?.title || req.body?.text || '').trim();
  if (!title) return res.status(400).json({ ok: false, error: 'title is required' });

  const payload = await readJsonSafe(TASKS_PATH, { tasks: [] });
  payload.tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  const task = taskTemplate(title);
  payload.tasks.unshift(task);
  const normalized = runOrchestrator(payload);
  await writeJson(TASKS_PATH, normalized);
  await rebuildState();

  res.status(201).json({ ok: true, task });
});

app.post('/api/toggles/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ ok: false, error: 'toggle id is required' });

  const world = await readJsonSafe(WORLD_PATH, { toggles: {}, metrics: {} });
  const value = typeof req.body?.value === 'boolean' ? req.body.value : !Boolean(world.toggles[id]);
  world.toggles[id] = value;
  world.metrics.lastToggleAt = nowIso();
  world.metrics.lastToggleId = id;
  await writeJson(WORLD_PATH, world);

  res.json({ ok: true, id, value, world });
});

app.post('/api/orchestrator/tick', async (_req, res) => {
  const payload = await readJsonSafe(TASKS_PATH, { tasks: [] });
  const result = tickFirstDoingTask(payload);
  await writeJson(TASKS_PATH, result.payload);
  await rebuildState();
  res.json({ ok: true, changed: result.changed, reason: result.reason || null, taskId: result.taskId || null });
});

app.post('/telegram/webhook', async (req, res) => {
  const msg = req.body?.message?.text || req.body?.edited_message?.text || '';
  const title = String(msg).trim();
  if (!title) return res.json({ ok: true, ignored: true });

  const payload = await readJsonSafe(TASKS_PATH, { tasks: [] });
  payload.tasks = Array.isArray(payload.tasks) ? payload.tasks : [];

  const low = title.toLowerCase();
  if (low === '/tick' || low === '/done') {
    const result = tickFirstDoingTask(payload);
    await writeJson(TASKS_PATH, result.payload);
    await rebuildState();
    return res.json({ ok: true, command: low, changed: result.changed, taskId: result.taskId || null });
  }

  const task = taskTemplate(title);
  payload.tasks.unshift(task);
  const normalized = runOrchestrator(payload);
  await writeJson(TASKS_PATH, normalized);
  await rebuildState();

  res.json({ ok: true, createdTaskId: task.id });
});

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => {
  console.log(`[office-backend] listening on :${PORT}`);
});
