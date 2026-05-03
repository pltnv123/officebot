#!/usr/bin/env node
/**
 * TUI Task Tracker for OpenClaw
 * 
 * Provides a terminal-friendly interface for tracking tasks with:
 * - Live progress bars
 * - Real-time ETA
 * - Dashboard updates
 * - Color-coded status
 * 
 * Usage:
 *   node scripts/tui-tracker.js <command> [options]
 * 
 * Examples:
 *   node scripts/tui-tracker.js run smoke-test.js
 *   node scripts/tui-tracker.js run-all
 *   node scripts/tui-tracker.js status
 */

const { spawn } = require('child_process');
const tracker = require('../backend/taskTracker');
const path = require('path');

const { createTask, startTask, updateProgress, completeTask, failTask, renderDashboard, formatDuration, getStats } = tracker;

// ANSI escape codes for TUI
const ESC = {
  clear: '\x1b[2J',
  home: '\x1b[H',
  up: '\x1b[A',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  save: '\x1b[s',
  restore: '\x1b[u',
  
  colors: {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    underline: '\x1b[4m',
    
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    bright: {
      black: '\x1b[90m',
      red: '\x1b[91m',
      green: '\x1b[92m',
      yellow: '\x1b[93m',
      blue: '\x1b[94m',
      magenta: '\x1b[95m',
      cyan: '\x1b[96m',
      white: '\x1b[97m'
    }
  }
};

class TUITracker {
  constructor(options = {}) {
    this.options = {
      refreshRate: options.refreshRate || 200, // ms
      showHistory: options.showHistory !== false,
      historyLimit: options.historyLimit || 5,
      ...options
    };
    
    this.activeTasks = new Map();
    this.refreshInterval = null;
    this.isRunning = false;
  }
  
  /**
   * Clear screen and render dashboard
   */
  render() {
    if (!this.isRunning) return;
    
    // Simple render without cursor control for compatibility
    console.log(this.renderHeader());
    console.log(renderDashboard());
  }
  
  /**
   * Render header with title and time
   */
  renderHeader() {
    const now = new Date().toLocaleTimeString('ru-RU');
    const stats = getStats();
    
    let output = '';
    output += `${ESC.colors.cyan}${ESC.colors.bold}`;
    output += '╔══════════════════════════════════════════════════════════╗\n';
    output += '║          🚀 WEBSTUDIO TUI TASK TRACKER                   ║\n';
    output += '╠══════════════════════════════════════════════════════════╣\n';
    output += `${ESC.colors.reset}`;
    output += `║  Time: ${now.padEnd(20)} Active: ${stats.active.toString().padStart(2)}  ║\n`;
    output += '╚══════════════════════════════════════════════════════════╝\n\n';
    
    return output;
  }
  
  /**
   * Render footer with controls
   */
  renderFooter() {
    let output = '\n';
    output += `${ESC.colors.dim}`;
    output += '─'.repeat(60) + '\n';
    output += 'Controls: Ctrl+C to exit | q to quit\n';
    output += `${ESC.colors.reset}`;
    
    return output;
  }
  
  /**
   * Start live refresh loop
   */
  start() {
    this.isRunning = true;
    // Don't hide cursor or clear screen for better compatibility
    
    this.refreshInterval = setInterval(() => {
      // Only render once at start, updates happen via progress callbacks
    }, 5000); // Slow refresh for status
    
    // Handle cleanup on exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }
  
  /**
   * Stop refresh loop and restore terminal
   */
  stop() {
    this.isRunning = false;
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    this.cleanup();
  }
  
  /**
   * Cleanup and restore terminal
   */
  cleanup() {
    process.stdout.write(ESC.showCursor);
    process.stdout.write(ESC.colors.reset);
    // Don't clear screen on exit - preserve output
  }
  
  /**
   * Run a command with tracking
   */
  async runCommand(command, args, options = {}) {
    const taskName = options.name || `${command} ${args.join(' ')}`;
    const task = createTask({
      name: taskName,
      description: 'Starting...',
      totalSteps: options.totalSteps || 10
    });
    
    this.activeTasks.set(task.taskId, task);
    
    console.log(`\n${ESC.colors.cyan}▶${ESC.colors.reset} Starting: ${ESC.colors.bold}${taskName}${ESC.colors.reset}`);
    
    return new Promise((resolve, reject) => {
      startTask(task.taskId);
      // Don't start TUI loop - just track progress
      
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      let lastProgressUpdate = 0;
      
      // Parse output for progress hints
      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        
        // Throttle progress updates
        const now = Date.now();
        if (now - lastProgressUpdate < 500) return;
        lastProgressUpdate = now;
        
        // Auto-detect progress from common patterns
        if (text.includes('✅') || text.includes('PASS')) {
          updateProgress(task.taskId, Math.min(0.95, task.progress + 0.1), 'Tests passing...');
        }
        if (text.includes('Step') || text.includes('Checking') || text.includes('Running')) {
          updateProgress(task.taskId, Math.min(0.9, task.progress + 0.05), text.trim().slice(0, 50));
        }
        if (text.includes('Opening') || text.includes('Launching')) {
          updateProgress(task.taskId, 0.1, 'Starting...');
        }
        if (text.includes('Reloading') || text.includes('Waiting')) {
          updateProgress(task.taskId, 0.5, 'In progress...');
        }
        if (text.includes('Final') || text.includes('Summary')) {
          updateProgress(task.taskId, 0.9, 'Finalizing...');
        }
        
        // Show progress bar update
        const progressBar = tracker.createProgressBar(task.progress);
        const percent = Math.round(task.progress * 100);
        const elapsed = formatDuration(task.elapsedTime);
        process.stdout.write(`\r${ESC.colors.dim}[${progressBar}]${ESC.colors.reset} ${percent}% — ${elapsed}  `);
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        // Clear progress line
        process.stdout.write('\r\x1b[2K');
        
        if (code === 0) {
          completeTask(task.taskId);
          console.log(`${ESC.colors.green}✔${ESC.colors.reset} ${taskName} completed (${formatDuration(task.elapsedTime)})`);
          resolve({ success: true, task, stdout, stderr });
        } else {
          failTask(task.taskId, `Exit code ${code}`);
          console.log(`${ESC.colors.red}✘${ESC.colors.reset} ${taskName} failed`);
          resolve({ success: false, task, stdout, stderr, code });
        }
      });
      
      child.on('error', (error) => {
        process.stdout.write('\r\x1b[2K');
        failTask(task.taskId, error);
        console.log(`${ESC.colors.red}✘${ESC.colors.reset} ${taskName} error: ${error.message}`);
        reject(error);
      });
    });
  }
  
  /**
   * Run multiple smoke tests sequentially
   */
  async runSmokeTests(testFiles, options = {}) {
    const results = [];
    const startTime = Date.now();
    
    console.log(`${ESC.colors.cyan}${ESC.colors.bold}`);
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║        🚀 WEBSTUDIO SMOKE TEST RUNNER                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`${ESC.colors.reset}`);
    console.log(`\n${ESC.colors.dim}Running ${testFiles.length} test(s):${ESC.colors.reset}`);
    for (const file of testFiles) {
      console.log(`   • ${path.basename(file)}`);
    }
    console.log();
    
    for (let i = 0; i < testFiles.length; i++) {
      const testFile = testFiles[i];
      console.log(`${ESC.colors.dim}[${i + 1}/${testFiles.length}]${ESC.colors.reset}`);
      
      const result = await this.runCommand('node', [testFile], {
        cwd: path.join(__dirname, '..'),
        name: path.basename(testFile)
      });
      
      results.push(result);
      
      if (i < testFiles.length - 1 && !options.stopOnFail) {
        console.log();
      }
      
      if (!result.success && options.stopOnFail) {
        console.log(`\n${ESC.colors.yellow}Stopping on first failure${ESC.colors.reset}`);
        break;
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log(`${ESC.colors.bold}FINAL SUMMARY${ESC.colors.reset}`);
    console.log('═'.repeat(60));
    
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;
    
    console.log(`\nTotal: ${results.length} | ${ESC.colors.green}Passed: ${passed}${ESC.colors.reset} | ${ESC.colors.red}Failed: ${failed}${ESC.colors.reset}`);
    console.log(`Total time: ${formatDuration(totalTime)}`);
    
    if (results.length > 0) {
      const avgTime = results.reduce((sum, r) => sum + (r.task?.elapsedTime || 0), 0) / results.length;
      console.log(`Average test time: ${formatDuration(avgTime)}`);
    }
    
    console.log(renderDashboard());
    
    return results;
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const tui = new TUITracker();
  
  try {
    if (command === 'run') {
      // Run single command
      const [script, ...scriptArgs] = args.slice(1);
      if (!script) {
        console.log('Usage: node tui-tracker.js run <script.js>');
        process.exit(1);
      }
      
      await tui.runCommand('node', [script, ...scriptArgs], {
        cwd: path.join(__dirname, '..'),
        name: path.basename(script)
      });
      
    } else if (command === 'run-all' || command === '--all') {
      // Run all smoke tests
      const fs = require('fs');
      const scriptsDir = path.join(__dirname);
      const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('-smoke.js'));
      
      await tui.runSmokeTests(files.map(f => path.join(scriptsDir, f)));
      
    } else if (command === 'status') {
      // Show current status
      console.log(renderDashboard());
      
    } else if (command === 'demo') {
      // Run demo
      const demoPath = path.join(__dirname, 'tracker-demo.js');
      await tui.runCommand('node', [demoPath]);
      
    } else {
      // Show help
      console.log(`
${ESC.colors.cyan}${ESC.colors.bold}WebStudio TUI Task Tracker${ESC.colors.reset}

${ESC.colors.bold}Usage:${ESC.colors.reset}
  node scripts/tui-tracker.js <command> [options]

${ESC.colors.bold}Commands:${ESC.colors.reset}
  run <script.js>       Run a single script with tracking
  run-all               Run all smoke tests sequentially
  status                Show current task status
  demo                  Run tracker demo

${ESC.colors.bold}Examples:${ESC.colors.reset}
  node scripts/tui-tracker.js run webstudio-last-project-restore-smoke.js
  node scripts/tui-tracker.js run-all
  node scripts/tui-tracker.js status
  node scripts/tui-tracker.js demo
`);
    }
    
  } catch (error) {
    tui.stop();
    console.error(`${ESC.colors.red}Error:${ESC.colors.reset}`, error.message);
    process.exit(1);
  }
}

main();
