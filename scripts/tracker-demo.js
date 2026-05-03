#!/usr/bin/env node
/**
 * Task Tracker Demo — Shows live progress bars and dashboard
 * 
 * Run: node scripts/tracker-demo.js
 */

const tracker = require('../backend/taskTracker');
const { createTask, startTask, updateProgress, completeTask, failTask, renderDashboard, formatDuration, withTaskTracking } = tracker;

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
  console.clear();
  console.log(`${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}`);
  console.log(`${COLORS.cyan}  🎯 TASK TRACKER LIVE DEMO${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}\n`);
  
  // Demo 1: Simple task with progress
  console.log(`${COLORS.yellow}Demo 1: Simple task with progress bar${COLORS.reset}\n`);
  
  const task1 = createTask({ name: 'Building project', totalSteps: 5 });
  startTask(task1.taskId);
  
  const steps = [
    'Installing dependencies...',
    'Compiling TypeScript...',
    'Running linter...',
    'Running tests...',
    'Creating bundle...'
  ];
  
  for (let i = 0; i < steps.length; i++) {
    updateProgress(task1.taskId, (i + 1) / steps.length, steps[i]);
    console.log(renderDashboard());
    await sleep(800);
    process.stdout.write('\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[1A\x1b[2J\x1b[H');
  }
  
  completeTask(task1.taskId);
  console.log(renderDashboard());
  await sleep(500);
  
  // Demo 2: Multiple concurrent tasks
  console.log(`\n${COLORS.yellow}Demo 2: Multiple concurrent tasks${COLORS.reset}\n`);
  await sleep(500);
  
  const task2 = createTask({ name: 'Running smoke tests', totalSteps: 10 });
  const task3 = createTask({ name: 'Deploying to staging', totalSteps: 8 });
  const task4 = createTask({ name: 'Generating reports', totalSteps: 6 });
  
  startTask(task2.taskId);
  startTask(task3.taskId);
  startTask(task4.taskId);
  
  // Simulate concurrent progress
  for (let i = 0; i < 20; i++) {
    if (task2.status === tracker.TaskStatus.RUNNING) {
      updateProgress(task2.taskId, Math.min(1, task2.progress + 0.05), `Test ${Math.floor(task2.progress * 10)}/10`);
    }
    if (task3.status === tracker.TaskStatus.RUNNING) {
      updateProgress(task3.taskId, Math.min(1, task3.progress + 0.04), `Step ${Math.floor(task3.progress * 8)}/8`);
    }
    if (task4.status === tracker.TaskStatus.RUNNING) {
      updateProgress(task4.taskId, Math.min(1, task4.progress + 0.06), `Report ${Math.floor(task4.progress * 6)}/6`);
    }
    
    console.log(renderDashboard());
    await sleep(400);
    
    if (i < 19) {
      // Clear screen and move cursor to top
      process.stdout.write('\x1b[2J\x1b[H');
    }
  }
  
  completeTask(task2.taskId);
  completeTask(task3.taskId);
  completeTask(task4.taskId);
  
  console.log(renderDashboard());
  await sleep(500);
  
  // Demo 3: Task with error
  console.log(`\n${COLORS.yellow}Demo 3: Failed task${COLORS.reset}\n`);
  await sleep(500);
  
  const task5 = createTask({ name: 'Integration test', totalSteps: 5 });
  startTask(task5.taskId);
  
  for (let i = 0; i < 3; i++) {
    updateProgress(task5.taskId, (i + 1) / 5, `Step ${i + 1}/5`);
    console.log(renderDashboard());
    await sleep(600);
    if (i < 2) process.stdout.write('\x1b[2J\x1b[H');
  }
  
  failTask(task5.taskId, 'Connection timeout after 30s');
  console.log(renderDashboard());
  
  // Demo 4: withTaskTracking wrapper
  console.log(`\n${COLORS.yellow}Demo 4: Async function wrapper${COLORS.reset}\n`);
  await sleep(500);
  
  await withTaskTracking(async ({ updateProgress, setTotalSteps }) => {
    setTotalSteps(4);
    updateProgress(0.1, 'Initializing...');
    await sleep(400);
    updateProgress(0.3, 'Processing data...');
    await sleep(400);
    updateProgress(0.6, 'Validating results...');
    await sleep(400);
    updateProgress(0.9, 'Finalizing...');
    await sleep(400);
    return { items: 42, duration: '1.6s' };
  }, { name: 'Data pipeline' });
  
  console.log(renderDashboard());
  
  // Final stats
  await sleep(500);
  console.log(`\n${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}`);
  console.log(`${COLORS.cyan}  📊 SESSION STATISTICS${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}\n`);
  
  const stats = tracker.getStats();
  console.log(`Total tasks: ${stats.total}`);
  console.log(`Completed: ${COLORS.green}${stats.completed}${COLORS.reset}`);
  console.log(`Failed: ${COLORS.red}${stats.failed}${COLORS.reset}`);
  console.log(`Average duration: ${formatDuration(stats.avgDuration)}`);
  
  console.log(`\n${COLORS.green}Demo complete!${COLORS.reset}\n`);
}

demo().catch(console.error);
