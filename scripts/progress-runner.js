#!/usr/bin/env node
/**
 * Simple Progress Runner for Smoke Tests
 * 
 * Shows a live progress bar with elapsed time and ETA.
 * 
 * Usage:
 *   node scripts/progress-runner.js <test-file.js>
 *   node scripts/progress-runner.js --all
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

// Progress bar
function progressBar(progress, width = 40) {
  const filled = Math.round(progress * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  if (progress >= 1) return `${C.green}${bar}${C.reset}`;
  if (progress < 0.3) return `${C.cyan}${bar}${C.reset}`;
  if (progress < 0.6) return `${C.yellow}${bar}${C.reset}`;
  return `${C.cyan}${bar}${C.reset}`;
}

// Format duration
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
}

// Estimate ETA
function estimateETA(progress, elapsed) {
  if (progress <= 0.05 || progress >= 1) return null;
  const total = elapsed / progress;
  const remaining = total - elapsed;
  return Math.max(0, remaining);
}

// Run single test
async function runTest(testFile) {
  const testName = path.basename(testFile);
  const startTime = Date.now();
  
  console.log(`\n${C.cyan}▶${C.reset} ${C.bold}${testName}${C.reset}`);
  
  return new Promise((resolve) => {
    const child = spawn('node', [testFile], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let progress = 0.05;
    let lastUpdate = Date.now();
    let stdout = '';
    let stderr = '';
    
    // Show progress
    const showProgress = () => {
      const elapsed = Date.now() - startTime;
      const eta = estimateETA(progress, elapsed);
      const etaStr = eta ? ` | ETA: ${formatDuration(eta)}` : '';
      const bar = progressBar(progress);
      const elapsedStr = formatDuration(elapsed);
      
      process.stdout.write(`\r${C.dim}[${bar}]${C.reset} ${Math.round(progress * 100)}% — ${elapsedStr}${etaStr}  `);
    };
    
    const progressInterval = setInterval(() => {
      // Slowly increase progress if no updates
      if (Date.now() - lastUpdate > 2000 && progress < 0.9) {
        progress = Math.min(0.9, progress + 0.02);
        showProgress();
      }
    }, 500);
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      lastUpdate = Date.now();
      
      // Detect progress from output
      if (text.includes('✅')) progress = Math.min(0.95, progress + 0.1);
      if (text.includes('Step') || text.includes('Checking')) progress = Math.min(0.8, progress + 0.05);
      if (text.includes('Reloading') || text.includes('Waiting')) progress = 0.5;
      if (text.includes('Final') || text.includes('Summary')) progress = 0.9;
      
      showProgress();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      clearInterval(progressInterval);
      process.stdout.write('\r\x1b[2K'); // Clear line
      
      const elapsed = Date.now() - startTime;
      
      if (code === 0) {
        console.log(`${C.green}✔${C.reset} ${testName} ${C.dim}(${formatDuration(elapsed)})${C.reset}`);
        resolve({ success: true, elapsed, stdout, stderr });
      } else {
        console.log(`${C.red}✘${C.reset} ${testName} ${C.dim}(${formatDuration(elapsed)})${C.reset}`);
        resolve({ success: false, elapsed, stdout, stderr, code });
      }
    });
    
    child.on('error', (error) => {
      clearInterval(progressInterval);
      process.stdout.write('\r\x1b[2K');
      console.log(`${C.red}✘${C.reset} ${testName} ${C.dim}Error: ${error.message}${C.reset}`);
      resolve({ success: false, elapsed: Date.now() - startTime, error });
    });
  });
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const testFiles = [];
  
  if (args.includes('--all')) {
    const scriptsDir = path.join(__dirname);
    const files = fs.readdirSync(scriptsDir);
    for (const file of files) {
      if (file.endsWith('-smoke.js')) {
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
    console.log(`${C.yellow}Usage:${C.reset}`);
    console.log('  node scripts/progress-runner.js <test-file.js>');
    console.log('  node scripts/progress-runner.js --all');
    process.exit(1);
  }
  
  console.log(`${C.cyan}${C.bold}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🚀 WEBSTUDIO PROGRESS RUNNER                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);
  console.log(`${C.gray}Running ${testFiles.length} test(s):${C.reset}`);
  for (const file of testFiles) {
    console.log(`   • ${path.basename(file)}`);
  }
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < testFiles.length; i++) {
    const result = await runTest(testFiles[i]);
    results.push(result);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(`${C.bold}SUMMARY${C.reset}`);
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  
  console.log(`\nTotal: ${results.length} | ${C.green}Passed: ${passed}${C.reset} | ${C.red}Failed: ${failed}${C.reset}`);
  console.log(`Total time: ${formatDuration(totalTime)}`);
  
  if (results.length > 0) {
    const avgTime = results.reduce((sum, r) => sum + (r.elapsed || 0), 0) / results.length;
    console.log(`Average test time: ${formatDuration(avgTime)}`);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`${C.red}Fatal error:${C.reset}`, error);
  process.exit(1);
});
