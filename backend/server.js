const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const { WebSocketServer } = require('ws');
const { runOrchestrator, tickFirstDoingTask } = require('./taskOrchestrator');
const { normalizeEvent, deriveTaskLiveState } = require('./liveEventContract');
const { applyRuntimeEventGuards, ensureIdempotentTaskFinalState } = require('./runtimeGuards');
const { buildTaskUiView, buildRuntimeUiView } = require('./uiStateView');
const { buildOperatorSurface } = require('./operatorLayer');
const { buildKnowledgeAwareContext, buildDecisionConsumerSurface } = require('./knowledgeAwareLayer');
const { buildExecutiveSummary } = require('./executiveSummaryLayer');
const { buildStakeholderHandoffBundle } = require('./stakeholderHandoffLayer');
const { buildExportIndex } = require('./exportIndexLayer');
const { buildDeliveryPack } = require('./deliveryPackLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildAssistedExecutionHandoff } = require('./assistedExecutionHandoffLayer');
const { buildAssistedExecutionPresentation } = require('./assistedExecutionPresentationLayer');
const { buildAssistedExecutionDeliveryBundle } = require('./assistedExecutionDeliveryLayer');
const { buildAssistedExecutionBundleIndex } = require('./assistedExecutionBundleIndexLayer');
const { buildAssistedExecutionPublishingPack } = require('./assistedExecutionPublishingPackLayer');
const { buildAssistedExecutionStakeholderPackage } = require('./assistedExecutionStakeholderPackageLayer');
const { buildAssistedExecutionRecipientBriefing } = require('./assistedExecutionRecipientBriefingLayer');
const { executeOperatorAction } = require('./operatorActions');
const supabaseStore = require('./supabaseStore');

// ═══ Autonomous Agent System ═══
const {
  addTask: autoAddTask,
  listTasks: autoListTasks,
  listAgents: autoListAgents,
  completeTask: autoCompleteTask,
  executeTask: autoExecuteTask,
  getTask: autoGetTask,
  tick: autoTick,
} = require('./autonomousApi');
// ═══════════════════════════════════

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

async function collectAgentRunsFromQueue() {
  try {
    const queue = await readJsonSafe(path.join(ROOT, 'task_queue.json'), { tasks: [] });
    const queueTasks = Array.isArray(queue?.tasks) ? queue.tasks : [];
    return queueTasks.map((task) => ({
      id: `${task.id}:run`,
      agent_id: task.agent || task.role || null,
      role: task.role || task.agent || null,
      task_id: task.id,
      status: task.assignment_state || task.status || null,
      assigned_by: task.assigned_by || 'orchestrator',
      capabilities: task.role ? [task.role] : [],
      payload: task,
      created_at: task.created_at || nowIso(),
      updated_at: nowIso(),
    }));
  } catch {
    return [];
  }
}

async function persistSnapshot(tasksPayload = null) {
  const snapshot = await supabaseStore.loadLocalSnapshot();
  if (tasksPayload) snapshot.tasksPayload = tasksPayload;
  snapshot.agentRuns = await collectAgentRunsFromQueue();
  const result = await supabaseStore.persistRuntimeSnapshot(snapshot);
  console.log('[office-backend] TASK WRITE SYNC', JSON.stringify({
    storage: result?.source || 'unknown',
    ok: Boolean(result?.ok),
    agentRuns: snapshot.agentRuns.length,
  }));
  return result;
}

function resolveActorRole(req) {
  const headerRole = String(req?.headers?.['x-actor-role'] || req?.headers?.['x-operator-role'] || '').trim().toLowerCase();
  const queryRole = String(req?.query?.actorRole || req?.query?.actor_role || '').trim().toLowerCase();
  const bodyRole = String(req?.body?.actorRole || req?.body?.actor_role || '').trim().toLowerCase();
  const allowed = new Set(['orchestrator', 'cto', 'qa', 'backend', 'ios']);
  const candidate = headerRole || queryRole || bodyRole || 'orchestrator';
  return allowed.has(candidate) ? candidate : 'orchestrator';
}

async function buildRuntimeStateResponse(actorRole = 'orchestrator') {
  const remote = await supabaseStore.fetchTasksState();
  const state = await readJsonSafe(STATE_PATH, { tasks: [], bots: [], world: { toggles: {}, metrics: {} } });
  const world = await readJsonSafe(WORLD_PATH, { toggles: {}, metrics: {} });

  const remotePayload = remote?.payload || {};
  const runtimeState = remote.source === 'supabase' ? remotePayload.runtime_state?.state_json || {} : {};
  const runtimeWorld = remote.source === 'supabase' ? remotePayload.runtime_state?.world_json || {} : {};
  const enriched = {
    ...state,
    ...runtimeState,
    world: state.world || runtimeWorld || world,
  };
  const tasks = Array.isArray(remotePayload?.tasks)
    ? remotePayload.tasks
    : (Array.isArray(enriched?.taskState?.tasks)
      ? enriched.taskState.tasks
      : (Array.isArray(enriched?.tasks) ? enriched.tasks : []));

  const normalizedTasks = tasks.map((task, idx) => ensureIdempotentTaskFinalState({
    ...task,
    assignee: inferAssignee(task, idx),
  }));

  const agentMap = new Map();
  normalizedTasks.forEach((task) => {
    const role = inferAssignee(task);
    if (!role) return;
    if (!agentMap.has(role)) {
      agentMap.set(role, {
        id: role,
        role,
        state: 'idle',
        isWorking: false,
        taskId: '',
      });
    }
    if (String(task?.status || '').toLowerCase() === 'done') return;
    const agent = agentMap.get(role);
    agent.state = String(task?.status || 'doing').toLowerCase();
    agent.isWorking = true;
    agent.taskId = String(task?.id || '');
  });

  const columnKeys = ['inbox', 'queue', 'planning', 'doing', 'review', 'done'];
  const columnTaskCounts = columnKeys.map(() => 0);
  normalizedTasks.forEach((task) => {
    const status = String(task?.status || '').toLowerCase();
    let column = 1;
    if (status === 'inbox') column = 0;
    else if (status === 'queue') column = 1;
    else if (status === 'plan' || status === 'planning') column = 2;
    else if (status === 'work' || status === 'doing') column = 3;
    else if (status === 'review' || status === 'rework') column = 4;
    else if (status === 'done') column = 5;
    columnTaskCounts[column] += 1;
  });

  enriched.updatedAt = String(enriched.updatedAt || enriched.timestamp || nowIso());
  enriched.tasks = normalizedTasks;
  enriched.taskState = { ...(enriched.taskState || {}), tasks: normalizedTasks };
  const runtimeAgents = Array.isArray(runtimeState?.agents) ? runtimeState.agents : [];
  runtimeAgents.forEach((agent) => {
    const key = String(agent?.id || agent?.role || '').toLowerCase();
    if (!key) return;
    agentMap.set(key, {
      id: key,
      role: agent.role || key,
      state: agent.status || agent.state || 'idle',
      isWorking: Boolean(agent.currentTask || agent.taskId),
      taskId: String(agent.currentTask || agent.taskId || ''),
      capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : [],
      assignment_state: agent.assignment_state || null,
    });
  });
  ['cto', 'orchestrator', 'backend', 'qa', 'ios'].forEach((role) => {
    if (!agentMap.has(role)) {
      agentMap.set(role, {
        id: role,
        role,
        state: 'idle',
        isWorking: false,
        taskId: '',
        capabilities: role === 'orchestrator'
          ? ['routing', 'status_transitions', 'assignment', 'review_escalation']
          : role === 'cto'
            ? ['review', 'escalation', 'approval']
            : role === 'qa'
              ? ['verification', 'smoke', 'review']
              : role === 'ios'
                ? ['implementation', 'mobile_execution', 'artifacts']
                : ['implementation', 'task_execution', 'artifacts'],
        assignment_state: null,
      });
    }
  });
  enriched.agents = Array.from(agentMap.values());
  const rawEvents = Array.isArray(remotePayload?.events)
    ? remotePayload.events
    : (Array.isArray(enriched.events) ? enriched.events : []);
  enriched.events = applyRuntimeEventGuards(rawEvents).map((event) => normalizeEvent(event));
  enriched.tasks = normalizedTasks.map((task) => ({
    ...task,
    live_state: deriveTaskLiveState(task),
  }));
  enriched.taskState = { ...(enriched.taskState || {}), tasks: enriched.tasks };
  enriched.ui = buildRuntimeUiView({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  });
  enriched.operator = buildOperatorSurface({
    updatedAt: enriched.updatedAt,
    actorRole,
    tasks: enriched.tasks,
  });
  enriched.knowledge_context = buildKnowledgeAwareContext({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole);
  enriched.executive_summary = buildExecutiveSummary({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.stakeholder_handoff = buildStakeholderHandoffBundle({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.export_index = buildExportIndex({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.delivery_pack = buildDeliveryPack({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.decision_assistance = buildDecisionAssistanceSurface({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.assisted_execution_handoff = buildAssistedExecutionHandoff({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.assisted_execution_presentation = buildAssistedExecutionPresentation({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.assisted_execution_delivery = buildAssistedExecutionDeliveryBundle({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.assisted_execution_bundle_index = buildAssistedExecutionBundleIndex({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.assisted_execution_publishing_pack = buildAssistedExecutionPublishingPack({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.assisted_execution_stakeholder_package = buildAssistedExecutionStakeholderPackage({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.assisted_execution_recipient_briefing = buildAssistedExecutionRecipientBriefing({
    updatedAt: enriched.updatedAt,
    tasks: enriched.tasks,
  }, actorRole === 'cto' ? 'cto' : 'orchestrator');
  enriched.storage = remote.source;
  enriched.board = {
    inboxCount: columnTaskCounts[0],
    doingCount: normalizedTasks.filter((task) => String(task?.status || '').toLowerCase() !== 'done').length,
    doneCount: normalizedTasks.filter((task) => String(task?.status || '').toLowerCase() === 'done').length,
    columnTaskCounts,
  };

  return enriched;
}

function mkTaskId() {
  return 'TASK-' + Date.now();
}

const ASSIGNEES = ['chief', 'planner', 'worker', 'tester'];

function normalizeAssignee(value) {
  const v = String(value || '').trim().toLowerCase();
  return ASSIGNEES.includes(v) ? v : '';
}

function inferAssignee(task, idx = 0) {
  const explicit = normalizeAssignee(task?.assignee);
  if (explicit) return explicit;

  const title = String(task?.title || '').toLowerCase();
  if (title.includes('review') || title.includes('тест')) return 'tester';
  if (title.includes('plan') || title.includes('план')) return 'planner';
  if (title.includes('work') || title.includes('реал')) return 'worker';

  return ASSIGNEES[Math.abs(Number(idx) || 0) % ASSIGNEES.length];
}

function taskTemplate(title, assignee = 'planner') {
  return {
    id: mkTaskId(),
    title,
    assignee,
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

app.get('/api/state', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  enriched.client = {
    updatedAt: enriched.updatedAt,
    actor_role: actorRole,
    reconnect_safe: true,
    backfill_safe: true,
    ui: enriched.ui,
    operator: enriched.operator?.client_payload || { reconnect_safe: true, backfill_safe: true, updatedAt: enriched.updatedAt, tasks: [] },
    analytics: enriched.operator?.analytics || null,
  };
  res.json(enriched);
});

app.get('/api/export/operator-snapshot', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    analytics: enriched.operator?.analytics || null,
    operator_snapshot: {
      updatedAt: enriched.updatedAt,
      tasks: enriched.operator?.client_payload?.tasks || [],
    },
  });
});

app.get('/api/export/knowledge-aware-context', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    knowledge_context: buildKnowledgeAwareContext({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole),
  });
});

app.get('/api/export/decision-context', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    decision_context: buildDecisionConsumerSurface({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole),
  });
});

app.get('/api/export/executive-summary', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    executive_summary: buildExecutiveSummary({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/stakeholder-handoff', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    stakeholder_handoff: buildStakeholderHandoffBundle({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/export-index', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    export_index: buildExportIndex({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/delivery-pack', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    delivery_pack: buildDeliveryPack({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/decision-assistance', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    decision_assistance: buildDecisionAssistanceSurface({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/assisted-execution-handoff', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    assisted_execution_handoff: buildAssistedExecutionHandoff({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/assisted-execution-presentation', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    assisted_execution_presentation: buildAssistedExecutionPresentation({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/assisted-execution-delivery', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    assisted_execution_delivery: buildAssistedExecutionDeliveryBundle({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/assisted-execution-bundle-index', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    assisted_execution_bundle_index: buildAssistedExecutionBundleIndex({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/assisted-execution-publishing-pack', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    assisted_execution_publishing_pack: buildAssistedExecutionPublishingPack({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/assisted-execution-stakeholder-package', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    assisted_execution_stakeholder_package: buildAssistedExecutionStakeholderPackage({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/export/assisted-execution-recipient-briefing', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const enriched = await buildRuntimeStateResponse(actorRole);
  res.json({
    ok: true,
    exportedAt: nowIso(),
    actor_role: actorRole,
    storage: enriched.storage,
    assisted_execution_recipient_briefing: buildAssistedExecutionRecipientBriefing({
      updatedAt: enriched.updatedAt,
      tasks: enriched.tasks || [],
    }, actorRole === 'cto' ? 'cto' : 'orchestrator'),
  });
});

app.get('/api/ops/health', async (_req, res) => {
  const state = await readJsonSafe(STATE_PATH, {});
  const world = await readJsonSafe(WORLD_PATH, { toggles: {}, metrics: {} });
  const tasks = Array.isArray(state?.taskState?.tasks)
    ? state.taskState.tasks
    : (Array.isArray(state?.tasks) ? state.tasks : []);
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
    stateUrl: STATE_PATH,
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
  const task = taskTemplate(title, inferAssignee({ title }, payload.tasks.length));
  payload.tasks.unshift(task);
  const normalized = runOrchestrator(payload);
  await writeJson(TASKS_PATH, normalized);
  await rebuildState();
  await persistSnapshot(normalized);

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
  await persistSnapshot();

  res.json({ ok: true, id, value, world });
});

app.post('/api/orchestrator/tick', async (_req, res) => {
  const payload = await readJsonSafe(TASKS_PATH, { tasks: [] });
  const result = tickFirstDoingTask(payload);
  await writeJson(TASKS_PATH, result.payload);
  await rebuildState();
  await persistSnapshot(result.payload);
  res.json({ ok: true, changed: result.changed, reason: result.reason || null, taskId: result.taskId || null });
});

app.post('/api/operator/action', async (req, res) => {
  const actorRole = resolveActorRole(req);
  const taskId = String(req.body?.taskId || '').trim();
  const action = String(req.body?.action || '').trim();
  if (!taskId || !action) return res.status(400).json({ ok: false, error: 'taskId and action are required' });

  const payload = await readJsonSafe(TASKS_PATH, { tasks: [] });
  payload.tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  const index = payload.tasks.findIndex((task) => String(task?.id || '') === taskId);
  if (index < 0) return res.status(404).json({ ok: false, error: 'task not found' });

  const executed = executeOperatorAction(payload.tasks[index], action, actorRole);
  if (executed.result?.status === 'forbidden') {
    return res.status(403).json({ ok: false, error: 'capability_denied', taskId, actor_role: actorRole, result: executed.result });
  }
  payload.tasks[index] = executed.task;
  const normalized = runOrchestrator(payload);
  await writeJson(TASKS_PATH, normalized);
  await rebuildState();
  await persistSnapshot(normalized);
  res.json({ ok: true, taskId, actor_role: actorRole, result: executed.result });
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
    await persistSnapshot(result.payload);
    return res.json({ ok: true, command: low, changed: result.changed, taskId: result.taskId || null });
  }

  const task = taskTemplate(title, inferAssignee({ title }, payload.tasks.length));
  payload.tasks.unshift(task);
  const normalized = runOrchestrator(payload);
  await writeJson(TASKS_PATH, normalized);
  await rebuildState();
  await persistSnapshot(normalized);

  res.json({ ok: true, createdTaskId: task.id });
});

// ═══ Autonomous Agent Endpoints ═══
app.post('/api/task', autoAddTask);              // POST /api/task — добавить задачу
app.get('/api/tasks', autoListTasks);            // GET /api/tasks — список задач
app.get('/api/agents', autoListAgents);          // GET /api/agents — статус агентов
app.get('/api/task/:id', autoGetTask);           // GET /api/task/:id — детали задачи
app.post('/api/task/:id/complete', autoCompleteTask); // POST /api/task/:id/complete — завершить
app.post('/api/task/:id/execute', autoExecuteTask);   // POST /api/task/:id/execute — запустить
app.post('/api/autonomous/tick', autoTick);      // POST /api/autonomous/tick — обработать одну задачу
// ═══════════════════════════════════

const PORT = Number(process.env.PORT || 8787);
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('[office-backend] ws connected');
  ws.send(JSON.stringify({ type: 'state', ts: nowIso() }));
});

setInterval(async () => {
  const runtimeState = await buildRuntimeStateResponse();
  const payload = {
    type: 'state',
    ts: nowIso(),
    tasks: runtimeState.taskState?.tasks || runtimeState.tasks || [],
    state: runtimeState,
    client: {
      updatedAt: runtimeState.updatedAt,
      actor_role: runtimeState.operator?.client_payload?.tasks?.[0]?.actor_role || 'orchestrator',
      reconnect_safe: true,
      backfill_safe: true,
      ui: runtimeState.ui,
      operator: runtimeState.operator?.client_payload || { reconnect_safe: true, backfill_safe: true, updatedAt: runtimeState.updatedAt, tasks: [] },
    },
    storage: runtimeState.storage,
  };
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(payload));
    }
  });
}, 5000);

supabaseStore.init().catch((error) => {
  console.error('[office-backend] supabase init failed:', error.message);
});

server.listen(PORT, () => {
  console.log(`[office-backend] listening on :${PORT}`);
});
