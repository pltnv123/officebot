#!/usr/bin/env node
/**
 * Professional Task Tracker for WebStudio
 * 
 * Features:
 * - Real-time progress bars with ETA
 * - Task status tracking (pending, running, completed, failed)
 * - Elapsed time and remaining time estimation
 * - Task history and statistics
 * - Console dashboard output
 */

const util = require('util');

// Task statuses
const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Active tasks registry
const tasks = new Map();
let taskIdCounter = 0;

// Progress bar configuration
const CONFIG = {
  barWidth: 40,
  updateIntervalMs: 100,
  showETA: true,
  showElapsed: true,
  colors: {
    running: '\x1b[36m',    // cyan
    completed: '\x1b[32m',  // green
    failed: '\x1b[31m',     // red
    pending: '\x1b[90m',    // gray
    reset: '\x1b[0m'
  }
};

/**
 * Generate unique task ID
 */
function generateTaskId() {
  return `task-${Date.now()}-${++taskIdCounter}`;
}

/**
 * Format milliseconds to human-readable string
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format time as HH:MM:SS
 */
function formatTime(date) {
  return date.toLocaleTimeString('ru-RU', { hour12: false });
}

/**
 * Create progress bar string
 */
function createProgressBar(progress, width = CONFIG.barWidth) {
  const filled = Math.round(progress * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  if (progress >= 1) return `\x1b[32m${bar}\x1b[0m`;
  if (progress < 0.25) return `\x1b[36m${bar}\x1b[0m`;
  if (progress < 0.5) return `\x1b[33m${bar}\x1b[0m`;
  return `\x1b[36m${bar}\x1b[0m`;
}

/**
 * Estimate remaining time based on progress and elapsed time
 */
function estimateRemaining(progress, elapsedMs) {
  if (progress <= 0 || progress >= 1) return null;
  const estimatedTotal = elapsedMs / progress;
  const remaining = estimatedTotal - elapsedMs;
  return Math.max(0, remaining);
}

/**
 * Create a new tracked task
 */
function createTask(options = {}) {
  const taskId = options.taskId || generateTaskId();
  const task = {
    taskId,
    name: options.name || 'Unnamed Task',
    description: options.description || '',
    status: TaskStatus.PENDING,
    progress: 0,
    totalSteps: options.totalSteps || 1,
    currentStep: 0,
    startTime: null,
    endTime: null,
    elapsedTime: 0,
    estimatedRemaining: null,
    metadata: options.metadata || {},
    error: null,
    createdAt: new Date()
  };
  
  tasks.set(taskId, task);
  return task;
}

/**
 * Start task execution
 */
function startTask(taskId) {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  
  task.status = TaskStatus.RUNNING;
  task.startTime = new Date();
  task.progress = 0.01; // Start at 1% to avoid division by zero
  
  return task;
}

/**
 * Update task progress
 */
function updateProgress(taskId, progress, stepInfo = '') {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  if (task.status !== TaskStatus.RUNNING) return;
  
  task.progress = Math.min(1, Math.max(0, progress));
  if (stepInfo) task.description = stepInfo;
  task.currentStep = Math.floor(progress * task.totalSteps);
  
  // Update elapsed time
  if (task.startTime) {
    task.elapsedTime = Date.now() - task.startTime.getTime();
    task.estimatedRemaining = estimateRemaining(task.progress, task.elapsedTime);
  }
  
  return task;
}

/**
 * Increment step counter
 */
function incrementStep(taskId, stepName = '') {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  
  task.currentStep++;
  const progress = task.currentStep / task.totalSteps;
  return updateProgress(taskId, progress, stepName);
}

/**
 * Mark task as completed
 */
function completeTask(taskId, result = null) {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  
  task.status = TaskStatus.COMPLETED;
  task.progress = 1;
  task.endTime = new Date();
  task.elapsedTime = task.endTime - task.startTime;
  task.estimatedRemaining = 0;
  task.result = result;
  
  return task;
}

/**
 * Mark task as failed
 */
function failTask(taskId, error) {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  
  task.status = TaskStatus.FAILED;
  task.endTime = new Date();
  task.elapsedTime = task.endTime - task.startTime;
  task.error = error instanceof Error ? error.message : String(error);
  task.estimatedRemaining = 0;
  
  return task;
}

/**
 * Get task by ID
 */
function getTask(taskId) {
  return tasks.get(taskId);
}

/**
 * Get all active tasks
 */
function getActiveTasks() {
  return Array.from(tasks.values()).filter(t => 
    t.status === TaskStatus.RUNNING || t.status === TaskStatus.PENDING
  );
}

/**
 * Get task history
 */
function getTaskHistory(limit = 20) {
  return Array.from(tasks.values())
    .filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.FAILED)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/**
 * Render task status line
 */
function renderTaskLine(task, showDetails = false) {
  const color = CONFIG.colors[task.status] || CONFIG.colors.pending;
  const statusIcon = {
    [TaskStatus.PENDING]: '⏳',
    [TaskStatus.RUNNING]: '🔄',
    [TaskStatus.COMPLETED]: '✅',
    [TaskStatus.FAILED]: '❌',
    [TaskStatus.CANCELLED]: '⏹️'
  }[task.status] || '•';
  
  const progressBar = task.status === TaskStatus.RUNNING 
    ? createProgressBar(task.progress)
    : task.status === TaskStatus.COMPLETED
      ? createProgressBar(1)
      : createProgressBar(task.progress);
  
  const progressPercent = Math.round(task.progress * 100);
  const elapsed = task.elapsedTime ? formatDuration(task.elapsedTime) : '-';
  const eta = task.estimatedRemaining ? formatDuration(task.estimatedRemaining) : '-';
  
  let line = `${color}${statusIcon}\x1b[0m [${progressBar}] ${progressPercent}% — ${task.name}`;
  
  if (showDetails && task.status === TaskStatus.RUNNING) {
    line += `\n   ├─ Elapsed: ${elapsed}`;
    if (task.estimatedRemaining !== null) {
      line += ` | ETA: ${eta}`;
    }
    if (task.description) {
      line += `\n   └─ ${task.description}`;
    }
  }
  
  if (task.status === TaskStatus.COMPLETED) {
    line += ` (${elapsed})`;
  }
  
  if (task.status === TaskStatus.FAILED) {
    line += `\n   └─ \x1b[31mError: ${task.error}\x1b[0m`;
  }
  
  return line;
}

/**
 * Render dashboard of all tasks
 */
function renderDashboard() {
  const activeTasks = getActiveTasks();
  const recentHistory = getTaskHistory(5);
  
  let output = '\n';
  output += '╔══════════════════════════════════════════════════════════╗\n';
  output += '║           📊 WEBSTUDIO TASK DASHBOARD                    ║\n';
  output += '╠══════════════════════════════════════════════════════════╣\n';
  
  if (activeTasks.length === 0) {
    output += '║  No active tasks                                         ║\n';
  } else {
    output += `║  Active Tasks: ${activeTasks.length}${' '.repeat(42 - activeTasks.length.toString().length)}║\n`;
    output += '╠──────────────────────────────────────────────────────────╣\n';
    
    for (const task of activeTasks) {
      const lines = renderTaskLine(task, true).split('\n');
      for (const line of lines) {
        const padded = line.padEnd(58);
        output += `║  ${padded}  ║\n`;
      }
    }
  }
  
  if (recentHistory.length > 0) {
    output += '╠──────────────────────────────────────────────────────────╣\n';
    output += `║  Recent History (${recentHistory.length})${' '.repeat(36 - recentHistory.length.toString().length)}║\n`;
    output += '╠──────────────────────────────────────────────────────────╣\n';
    
    for (const task of recentHistory) {
      const line = renderTaskLine(task, false);
      const padded = line.replace(/\x1b\[\d+m/g, '').padEnd(58);
      output += `║  ${padded}  ║\n`;
    }
  }
  
  output += '╚══════════════════════════════════════════════════════════╝\n';
  
  return output;
}

/**
 * Wrap an async function with task tracking
 */
async function withTaskTracking(fn, options = {}) {
  const task = createTask(options);
  
  try {
    startTask(task.taskId);
    const result = await fn({
      taskId: task.taskId,
      updateProgress: (progress, stepInfo) => updateProgress(task.taskId, progress, stepInfo),
      incrementStep: (stepName) => incrementStep(task.taskId, stepName),
      setTotalSteps: (total) => { task.totalSteps = total; }
    });
    
    completeTask(task.taskId, result);
    return result;
  } catch (error) {
    failTask(task.taskId, error);
    throw error;
  }
}

/**
 * Clear completed tasks older than specified minutes
 */
function cleanupOldTasks(maxAgeMinutes = 60) {
  const cutoff = Date.now() - (maxAgeMinutes * 60 * 1000);
  for (const [taskId, task] of tasks.entries()) {
    if ((task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) &&
        task.createdAt.getTime() < cutoff) {
      tasks.delete(taskId);
    }
  }
}

/**
 * Get statistics
 */
function getStats() {
  const all = Array.from(tasks.values());
  return {
    total: all.length,
    active: all.filter(t => t.status === TaskStatus.RUNNING).length,
    pending: all.filter(t => t.status === TaskStatus.PENDING).length,
    completed: all.filter(t => t.status === TaskStatus.COMPLETED).length,
    failed: all.filter(t => t.status === TaskStatus.FAILED).length,
    avgDuration: all
      .filter(t => t.status === TaskStatus.COMPLETED && t.elapsedTime)
      .reduce((sum, t) => sum + t.elapsedTime, 0) / 
      Math.max(1, all.filter(t => t.status === TaskStatus.COMPLETED).length)
  };
}

// Export API
module.exports = {
  TaskStatus,
  createTask,
  startTask,
  updateProgress,
  incrementStep,
  completeTask,
  failTask,
  getTask,
  getActiveTasks,
  getTaskHistory,
  renderTaskLine,
  renderDashboard,
  withTaskTracking,
  cleanupOldTasks,
  getStats,
  formatDuration,
  CONFIG
};
