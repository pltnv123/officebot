const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, 'state.json');
const MAPPING_PATH = path.join(ROOT, 'agents', 'agency', 'MAPPING.json');
const REPORT_SCRIPT = path.join(ROOT, 'scripts', 'telegram', 'agent_report.sh');

// Zone → robot mapping for quick lookup
const ZONE_TO_ROBOT = {
  'ENGINEERING': 'worker',
  'GAME DEV': 'worker',
  'DESIGN': 'reviewer',
  'TESTING': 'reviewer',
  'PRODUCT': 'planner',
  'PM': 'planner',
  'MARKETING': 'planner',
  'SALES': 'chief',
};

class AgentRouter {
  constructor() {
    this.mapping = null;
    this.loaded = false;
  }

  async _loadMapping() {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(MAPPING_PATH, 'utf8');
      this.mapping = JSON.parse(raw);
    } catch (e) {
      console.error('[AgentRouter] Failed to load MAPPING.json:', e.message);
      this.mapping = {};
    }
    this.loaded = true;
  }

  /**
   * Detect which agent should handle a task based on keywords
   * @param {string} taskText - Task title/description
   * @returns {object} { agentKey, config } or null
   */
  async detectAgent(taskText) {
    await this._loadMapping();
    const text = taskText.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const [key, config] of Object.entries(this.mapping)) {
      const triggers = config.triggers || [];
      let score = 0;
      for (const trigger of triggers) {
        if (text.includes(trigger.toLowerCase())) {
          score += trigger.length; // longer matches = more specific
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { agentKey: key, config };
      }
    }

    return bestMatch;
  }

  /**
   * Route a task to the appropriate agent
   * @param {string} task - Task description
   * @param {string|null} division - Force specific division
   * @returns {object} { agentKey, robot, zone, taskId }
   */
  async routeTask(task, division = null) {
    await this._loadMapping();

    let agentInfo = null;

    if (division) {
      // Find first agent in the specified division
      for (const [key, config] of Object.entries(this.mapping)) {
        if (key.startsWith(division.toLowerCase() + '/')) {
          agentInfo = { agentKey: key, config };
          break;
        }
      }
    }

    if (!agentInfo) {
      agentInfo = await this.detectAgent(task);
    }

    // Default to WORKER if no match
    if (!agentInfo) {
      agentInfo = {
        agentKey: 'engineering/senior-developer',
        config: this.mapping['engineering/senior-developer'] || {
          robot: 'WORKER',
          zone: 'ENGINEERING',
          telegram_thread: 5,
        },
      };
    }

    return {
      agentKey: agentInfo.agentKey,
      robot: agentInfo.config.robot,
      zone: agentInfo.config.zone,
      telegram_thread: agentInfo.config.telegram_thread,
      task,
    };
  }

  /**
   * Execute an agent via openclaw CLI
   * @param {string} robot - Robot name (worker, planner, reviewer, etc)
   * @param {string} task - Task description
   * @returns {object} { success, output, error }
   */
  async executeAgent(robot, task) {
    const agentName = robot.toLowerCase();
    try {
      const output = execSync(
        `openclaw agent --agent ${agentName} --message "${task.replace(/"/g, '\\"')}" --deliver 2>&1`,
        { cwd: ROOT, timeout: 300000, encoding: 'utf8' }
      );
      return { success: true, output: output.trim() };
    } catch (e) {
      return { success: false, output: null, error: e.message };
    }
  }

  /**
   * Update agent status in state.json
   * @param {string} agentId - Agent ID (worker, planner, etc)
   * @param {string} status - New status (idle, working, done, error)
   * @param {string|null} taskId - Current task ID
   * @param {object|null} result - Task result
   */
  async updateStatus(agentId, status, taskId = null, result = null) {
    try {
      let state = {};
      try {
        state = JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
      } catch { /* empty state ok */ }

      if (!Array.isArray(state.agents)) {
        state.agents = [];
      }

      const idx = state.agents.findIndex(a => a.id === agentId);
      const agentState = {
        id: agentId,
        role: agentId.toUpperCase(),
        status,
        currentTask: taskId,
        lastUpdate: new Date().toISOString(),
        result,
      };

      if (idx >= 0) {
        state.agents[idx] = { ...state.agents[idx], ...agentState };
      } else {
        state.agents.push(agentState);
      }

      await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
      return agentState;
    } catch (e) {
      console.error('[AgentRouter] updateStatus error:', e.message);
      return null;
    }
  }

  /**
   * Send notification to Telegram
   * @param {string} agent - Agent name
   * @param {string} message - Message to send
   */
  async notifyTelegram(agent, message) {
    try {
      const escaped = message.replace(/"/g, '\\"').replace(/\$/g, '\\$');
      execSync(`bash "${REPORT_SCRIPT}" "${agent}" "${escaped}"`, {
        cwd: ROOT,
        timeout: 30000,
        encoding: 'utf8',
      });
      return true;
    } catch (e) {
      console.error('[AgentRouter] notifyTelegram error:', e.message);
      return false;
    }
  }

  /**
   * Get list of all agents
   * @returns {Array}
   */
  async listAgents() {
    await this._loadMapping();
    return Object.entries(this.mapping).map(([key, config]) => ({
      key,
      robot: config.robot,
      zone: config.zone,
      description: config.description,
    }));
  }

  /**
   * Get agents by robot
   * @param {string} robot
   * @returns {Array}
   */
  async getAgentsByRobot(robot) {
    await this._loadMapping();
    return Object.entries(this.mapping)
      .filter(([, config]) => config.robot === robot.toUpperCase())
      .map(([key, config]) => ({ key, ...config }));
  }
}

// Singleton
module.exports = new AgentRouter();
