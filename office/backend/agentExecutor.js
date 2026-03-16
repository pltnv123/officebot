const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, 'state.json');
const REPORT_SCRIPT = path.join(ROOT, 'scripts', 'telegram', 'agent_report.sh');

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

class AgentExecutor {
  constructor(agentRouter, taskQueue) {
    this.router = agentRouter;
    this.queue = taskQueue;
    this.running = new Map(); // taskId -> { process, agent }
  }

  /**
   * Execute a task with full lifecycle management
   * @param {object} agentConfig - { agentKey, robot, zone, telegram_thread }
   * @param {object} task - Task from queue { id, title, ... }
   * @returns {object} { success, result, error }
   */
  async run(agentConfig, task) {
    const { robot, agentKey } = agentConfig;
    const robotLower = robot.toLowerCase();

    try {
      // 1. Record task start in state.json
      await this._updateState('running', robotLower, task.id, {
        agentKey,
        startedAt: nowIso(),
      });

      // 2. Notify Telegram: agent is working
      await this._sendTelegram(robotLower, `🔄 Взял задачу: ${task.title}`);

      // 3. Execute via openclaw agent CLI
      const result = await this._executeOpenclaw(robotLower, task.title);

      // 4. Handle result
      if (result.success) {
        // 5. Update state.json as completed
        await this._updateState('completed', robotLower, task.id, {
          agentKey,
          completedAt: nowIso(),
          output: result.output?.slice(0, 500),
        });

        // 6. Notify Telegram: success
        await this._sendTelegram(
          robotLower,
          `✅ Завершил: ${task.title}\n${result.output?.slice(0, 200) || ''}`
        );

        // 7. Mark agent idle
        await this._updateState('idle', robotLower, null, null);

        return { success: true, result: result.output };
      } else {
        throw new Error(result.error || 'Agent execution failed');
      }
    } catch (e) {
      // Error handling
      await this._updateState('error', robotLower, task.id, {
        agentKey,
        error: e.message,
        failedAt: nowIso(),
      });

      await this._sendTelegram(robotLower, `❌ Ошибка: ${task.title}\n${e.message}`);

      await this._updateState('idle', robotLower, null, null);

      return { success: false, error: e.message };
    }
  }

  /**
   * Execute task through openclaw agent CLI
   * @private
   */
  async _executeOpenclaw(agent, taskText) {
    return new Promise((resolve) => {
      const escaped = taskText.replace(/"/g, '\\"');
      const proc = spawn('bash', ['-c', `openclaw agent --agent ${agent} --message "${escaped}" --deliver 2>&1`], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => { stdout += d; });
      proc.stderr.on('data', (d) => { stderr += d; });

      // Timeout after 5 minutes
      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        resolve({ success: false, error: 'Timeout after 5 minutes' });
      }, 300000);

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve({ success: true, output: stdout.trim() });
        } else {
          resolve({ success: false, error: stderr || `Exit code ${code}` });
        }
      });

      proc.on('error', (e) => {
        clearTimeout(timer);
        resolve({ success: false, error: e.message });
      });
    });
  }

  /**
   * Update state.json
   * @private
   */
  async _updateState(status, agentId, taskId, details) {
    try {
      let state = {};
      try {
        state = JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
      } catch { /* new state */ }

      if (!Array.isArray(state.agents)) state.agents = [];

      const idx = state.agents.findIndex(a => a.id === agentId);
      const agentState = {
        id: agentId,
        role: agentId.toUpperCase(),
        status,
        currentTask: taskId,
        updatedAt: nowIso(),
        ...details,
      };

      if (idx >= 0) {
        state.agents[idx] = { ...state.agents[idx], ...agentState };
      } else {
        state.agents.push(agentState);
      }

      state.timestamp = nowIso();
      await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.error('[AgentExecutor] _updateState error:', e.message);
    }
  }

  /**
   * Send Telegram notification
   * @private
   */
  async _sendTelegram(agent, message) {
    try {
      const safe = message.replace(/"/g, '\\"').replace(/\$/g, '\\$');
      spawn('bash', ['-c', `bash "${REPORT_SCRIPT}" "${agent}" "${safe}"`], {
        cwd: ROOT,
        stdio: 'ignore',
        detached: true,
      }).unref();
    } catch (e) {
      console.error('[AgentExecutor] _sendTelegram error:', e.message);
    }
  }

  /**
   * Check if an agent is currently running a task
   * @param {string} agentId
   * @returns {boolean}
   */
  isRunning(agentId) {
    return this.running.has(agentId);
  }

  /**
   * Get all currently running executions
   * @returns {Array}
   */
  getRunning() {
    return Array.from(this.running.entries()).map(([taskId, info]) => ({
      taskId,
      ...info,
    }));
  }
}

module.exports = AgentExecutor;
