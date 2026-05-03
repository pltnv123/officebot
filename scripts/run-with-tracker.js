#!/usr/bin/env node
/**
 * Smoke Test Runner with Professional Task Tracking
 * 
 * Usage:
 *   node scripts/run-with-tracker.js scripts/webstudio-last-project-restore-smoke.js
 *   node scripts/run-with-tracker.js --all
 *   node scripts/run-with-tracker.js script1.js script2.js script3.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const tracker = require('../backend/taskTracker');

const { createTask, startTask, updateProgress, completeTask, failTask, renderDashboard, formatDuration } = tracker;

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const testFiles = [];

if (args.includes('--all')) {
  // Find all smoke tests
  const scriptsDir = path.join(__dirname);
  const files = fs.readdirSync(scriptsDir);
  for (const file of files) {
    if (file.endsWith('-smoke.js') || file.endsWith('-smoke.test.js')) {
      testFiles.push(path.join(scriptsDir, file));
    }
  }
} else {
  for (const arg of args) {
    if (arg.endsWith('.js')) {
      const testPath = path.isAbsolute(arg) ? arg : path.join(__dirname, path.basename(arg));
      testFiles.push(testPath);
    }
  }
}

if (testFiles.length === 0) {
  console.log(`${COLORS.yellow}Usage:${COLORS.reset}`);
  console.log('  node scripts/run-with-tracker.js <test-file.js>');
  console.log('  node scripts/run-with-tracker.js --all');
  console.log('  node scripts/run-with-tracker.js test1.js test2.js test3.js');
  process.exit(1);
}

// Progress simulation for tests without internal progress reporting
function simulateProgress(taskId, intervalMs = 500) {
  const task = tracker.getTask(taskId);
  if (!task || task.status !== tracker.TaskStatus.RUNNING) return;
  
  const progressInterval = setInterval(() => {
    const currentTask = tracker.getTask(taskId);
    if (!currentTask || currentTask.status !== tracker.TaskStatus.RUNNING) {
      clearInterval(progressInterval);
      return;
    }
    
    // Increment progress slowly
    const newProgress = Math.min(0.95, currentTask.progress + 0.05);
    tracker.updateProgress(taskId, newProgress);
  }, intervalMs);
  
  return progressInterval;
}

// Run a single test with tracking
async function runTest(testFile) {
  const testName = path.basename(testFile);
  const task = createTask({
    name: testName,
    description: 'Starting...',
    totalSteps: 10
  });
  
  console.log(`\n${COLORS.cyan}▶${COLORS.reset} Starting: ${COLORS.bright}${testName}${COLORS.reset}`);
  
  return new Promise((resolve) => {
    startTask(task.taskId);
    const progressInterval = simulateProgress(task.taskId);
    
    const child = spawn('node', [testFile], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      // Try to extract progress from output
      if (text.includes('✅')) {
        updateProgress(task.taskId, 0.8, 'Tests passing...');
      }
      if (text.includes('Step') || text.includes('Checking')) {
        updateProgress(task.taskId, 0.5, text.trim().slice(0, 60));
      }
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      clearInterval(progressInterval);
      
      if (code === 0) {
        completeTask(task.taskId);
        console.log(`${COLORS.green}✔${COLORS.reset} Completed: ${testName} (${formatDuration(task.elapsedTime)})`);
        resolve({ success: true, task, stdout, stderr });
      } else {
        failTask(task.taskId, `Exit code ${code}`);
        console.log(`${COLORS.red}✘${COLORS.reset} Failed: ${testName}`);
        if (stderr) {
          console.log(`${COLORS.gray}${stderr.slice(0, 500)}${COLORS.reset}`);
        }
        resolve({ success: false, task, stdout, stderr });
      }
    });
    
    child.on('error', (error) => {
      clearInterval(progressInterval);
      failTask(task.taskId, error);
      console.log(`${COLORS.red}✘${COLORS.reset} Error: ${testName} - ${error.message}`);
      resolve({ success: false, task, error });
    });
  });
}

// Main execution
async function main() {
  console.log(`${COLORS.bright}${COLORS.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        🚀 WEBSTUDIO SMOKE TEST RUNNER WITH TRACKER       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${COLORS.reset}`);
  
  console.log(`\n${COLORS.gray}Running ${testFiles.length} test(s):${COLORS.reset}`);
  for (const file of testFiles) {
    console.log(`   • ${path.basename(file)}`);
  }
  
  const results = [];
  const startTime = Date.now();
  
  // Run tests sequentially with dashboard updates
  for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    console.log(`\n${COLORS.gray}[${i + 1}/${testFiles.length}]${COLORS.reset}`);
    
    const result = await runTest(testFile);
    results.push(result);
    
    // Show mini-dashboard after each test
    if (i < testFiles.length - 1) {
      console.log(renderDashboard());
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log(`${COLORS.bright}FINAL SUMMARY${COLORS.reset}`);
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  
  console.log(`\nTotal: ${results.length} | ${COLORS.green}Passed: ${passed}${COLORS.reset} | ${COLORS.red}Failed: ${failed}${COLORS.reset}`);
  console.log(`Total time: ${formatDuration(totalTime)}`);
  
  if (results.length > 0) {
    const avgTime = results.reduce((sum, r) => sum + (r.task?.elapsedTime || 0), 0) / results.length;
    console.log(`Average test time: ${formatDuration(avgTime)}`);
  }
  
  console.log('\n' + renderDashboard());
  
  // Exit with error if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
  process.exit(1);
});
