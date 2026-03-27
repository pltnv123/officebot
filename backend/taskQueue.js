const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUEUE_PATH = path.join(ROOT, 'task_queue.json');
const queueLock = require('./queueLock');


function mkTaskId() {
  return 'QUEUE-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function normalizeTitleForQueue(title) {
  return String(title || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

class TaskQueue {
  constructor() {
    this.tasks = [];
    this.loaded = false;
  }

  async _ensureLoaded() {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(QUEUE_PATH, 'utf8');
      const data = JSON.parse(raw);
      this.tasks = Array.isArray(data.tasks) ? data.tasks : [];
    } catch {
      this.tasks = [];
    }
    this.loaded = true;
  }

  async _save() {
    await fs.writeFile(QUEUE_PATH, JSON.stringify({ tasks: this.tasks }, null, 2), 'utf8');
  }

  /**
   * Add a task to the queue
   * @param {string} title - Task title/description
   * @param {number} priority - 1=highest, 5=lowest
   * @param {string|null} agent - Preferred agent role (null = auto-detect)
   * @param {object} extra - Additional metadata
   * @returns {object} Created task
   */
  async add(title, priority = 3, agent = null, extra = {}) {
    await this._ensureLoaded();
    const normalizedTitle = normalizeTitleForQueue(title);
    const agentKey = agent ? agent.toLowerCase() : '';
    const normalizedPriority = Number(priority || 3);
    const duplicate = this.tasks.some(t =>
      t.status === 'pending' &&
      normalizeTitleForQueue(t.title) === normalizedTitle &&
      ((t.agent || '').toLowerCase() === agentKey) &&
      Number(t.priority) === normalizedPriority
    );
    if (duplicate) {
      const err = new Error(`duplicate pending task "${title}" (agent=${agentKey || '<none>'} priority=${normalizedPriority})`);
      err.code = 'DUPLICATE_PENDING';
      throw err;
    }
    const task = {
      id: mkTaskId(),
      title,
      priority,
      agent: agent || null,
      status: 'pending',
      created_at: nowIso(),
      started_at: null,
      completed_at: null,
      result: null,
      error: null,
      attempts: 0,
      max_attempts: extra.maxAttempts || 3,
      ...extra,
    };
    this.tasks.push(task);
    this.tasks.sort((a, b) => a.priority - b.priority);
    await this._save();
    return task;
  }

  /**
   * Get next pending task (highest priority first)
   * @param {string|null} agentFilter - Only tasks for this agent
   * @returns {object|null}
   */
  async next(agentFilter = null) {
    await this._ensureLoaded();
    const pending = this.tasks.filter(t => t.status === 'pending');
    if (agentFilter) {
      return pending.find(t => !t.agent || t.agent === agentFilter) || null;
    }
    return pending[0] || null;
  }

  /**
   * Mark task as in progress
   * @param {string} taskId
   * @param {string} agent - Agent executing the task
   * @returns {object|null}
   */
  async start(taskId, agent) {
    return queueLock.withLock(() => this._startUnlocked(taskId, agent));
  }

  async _startUnlocked(taskId, agent) {
    await this._ensureLoaded();
    const task = this.tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'pending') return null;
    task.status = 'in_progress';
    task.agent = agent;
    task.started_at = nowIso();
    task.attempts += 1;
    await this._save();
    return task;
  }

  /**
   * Mark task as completed
   * @param {string} taskId
   * @param {object} result - Execution result
   * @returns {object|null}
   */
  async complete(taskId, result = {}) {
    await this._ensureLoaded();
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;
    task.status = 'completed';
    task.completed_at = nowIso();
    task.result = result;
    await this._save();
    return task;
  }

  /**
   * Mark task as failed
   * @param {string} taskId
   * @param {string} error - Error message
   * @returns {object|null}
   */
  async fail(taskId, error) {
    await this._ensureLoaded();
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;

    if (task.attempts < task.max_attempts) {
      task.status = 'pending'; // retry
      task.error = error;
    } else {
      task.status = 'failed';
      task.completed_at = nowIso();
      task.error = error;
    }
    await this._save();
    return task;
  }

  /**
   * Get all tasks with optional filter
   * @param {string|null} status - Filter by status
   * @returns {Array}
   */
  async getAll(status = null) {
    await this._ensureLoaded();
    if (status) {
      return this.tasks.filter(t => t.status === status);
    }
    return [...this.tasks];
  }

  /**
   * Get task by ID
   * @param {string} taskId
   * @returns {object|null}
   */
  async get(taskId) {
    await this._ensureLoaded();
    return this.tasks.find(t => t.id === taskId) || null;
  }

  /**
   * Get queue stats
   * @returns {object}
   */
  async stats() {
    await this._ensureLoaded();
    const byStatus = {};
    for (const t of this.tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    }
    return {
      total: this.tasks.length,
      byStatus,
      pending: byStatus.pending || 0,
      in_progress: byStatus.in_progress || 0,
      completed: byStatus.completed || 0,
      failed: byStatus.failed || 0,
    };
  }
}

// Singleton
module.exports = new TaskQueue();
