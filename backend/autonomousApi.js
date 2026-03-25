/**
 * Autonomous API — Integrates router, queue, and executor
 * Used by server.js to add autonomous task endpoints
 */

const agentRouter = require('./agentRouter');
const taskQueue = require('./taskQueue');
const AgentExecutor = require('./agentExecutor');

const executor = new AgentExecutor(agentRouter, taskQueue);

/**
 * POST /api/task — Add new task to queue
 */
async function addTask(req, res) {
  try {
    const title = String(req.body?.title || req.body?.text || '').trim();
    if (!title) {
      return res.status(400).json({ ok: false, error: 'title is required' });
    }

    const priority = Number(req.body?.priority || 3);
    const division = req.body?.division || null;
    const forceAgent = req.body?.agent || null;

    // Detect agent if not specified
    let agent = forceAgent;
    if (!agent) {
      const detected = await agentRouter.detectAgent(title);
      agent = detected?.config?.robot?.toLowerCase() || null;
    }

    const task = await taskQueue.add(title, priority, agent, {
      division,
      source: req.body?.source || 'api',
    });

    // Notify Telegram
    await agentRouter.notifyTelegram('chief', `📥 Новая задача: ${title}`);

    res.status(201).json({ ok: true, task });
  } catch (e) {
    if (e.code === 'DUPLICATE_PENDING') {
      return res.status(400).json({ ok: false, error: e.message, code: e.code });
    }
    res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * GET /api/tasks — List all tasks in queue
 */
async function listTasks(req, res) {
  try {
    const status = req.query?.status || null;
    const tasks = await taskQueue.getAll(status);
    const stats = await taskQueue.stats();
    res.json({ ok: true, tasks, stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * GET /api/agents — List all agents and their status
 */
async function listAgents(req, res) {
  try {
    const agents = await agentRouter.listAgents();

    // Enrich with current status from state.json
    let stateAgents = [];
    try {
      const fs = require('fs/promises');
      const path = require('path');
      const STATE_PATH = path.join(__dirname, '..', 'state.json');
      const state = JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
      stateAgents = Array.isArray(state.agents) ? state.agents : [];
    } catch { /* ok */ }

    // Group by robot
    const byRobot = {};
    for (const agent of agents) {
      const robot = agent.robot.toLowerCase();
      if (!byRobot[robot]) byRobot[robot] = [];
      const stateInfo = stateAgents.find(a => a.id === robot);
      byRobot[robot].push({
        ...agent,
        status: stateInfo?.status || 'idle',
        currentTask: stateInfo?.currentTask || null,
      });
    }

    res.json({ ok: true, agents, byRobot, running: executor.getRunning() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/task/:id/complete — Manually complete a task
 */
async function completeTask(req, res) {
  try {
    const taskId = req.params.id;
    const result = req.body?.result || { manual: true };
    const task = await taskQueue.complete(taskId, result);
    if (!task) {
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }
    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/task/:id/execute — Execute a specific task now
 */
async function executeTask(req, res) {
  try {
    const taskId = req.params.id;
    const task = await taskQueue.get(taskId);
    if (!task) {
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }

    // Detect agent
    const detected = await agentRouter.routeTask(task.title, task.division);
    const robot = detected.robot.toLowerCase();

    // Start execution in background
    taskQueue.start(taskId, robot).then(() => {
      executor.run(detected, task).then(async (result) => {
        if (result.success) {
          await taskQueue.complete(taskId, result);
        } else {
          await taskQueue.fail(taskId, result.error);
        }
      });
    });

    res.json({ ok: true, message: 'Execution started', agent: detected });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * GET /api/task/:id — Get task details
 */
async function getTask(req, res) {
  try {
    const taskId = req.params.id;
    const task = await taskQueue.get(taskId);
    if (!task) {
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }
    res.json({ ok: true, task });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /api/autonomous/tick — Process one task from queue (for manual/loop use)
 */
async function tick(req, res) {
  try {
    const task = await taskQueue.next();
    if (!task) {
      return res.json({ ok: true, message: 'No pending tasks', processed: false });
    }

    const detected = await agentRouter.routeTask(task.title, task.division);
    const robot = detected.robot.toLowerCase();

    await taskQueue.start(task.id, robot);

    // Execute (non-blocking response, execution in background)
    executor.run(detected, task).then(async (result) => {
      if (result.success) {
        await taskQueue.complete(task.id, result);
      } else {
        await taskQueue.fail(task.id, result.error);
      }
    });

    res.json({ ok: true, processed: true, taskId: task.id, agent: detected });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = {
  addTask,
  listTasks,
  listAgents,
  completeTask,
  executeTask,
  getTask,
  tick,
};
