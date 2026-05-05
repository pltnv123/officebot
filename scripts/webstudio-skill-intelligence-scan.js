#!/usr/bin/env node
/**
 * WebStudio Skill Intelligence Scan
 * 
 * Scans installed, eligible, and ClawHub skills.
 * Saves report to /tmp/webstudio-demo/skill-intelligence-report.json
 * Prints summary to stdout.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_PATH = '/tmp/webstudio-demo/skill-intelligence-report.json';

function runCommand(cmd) {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, output: output.trim() };
  } catch (err) {
    return { ok: false, output: err.stdout || '', stderr: err.stderr || '', code: err.status };
  }
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function main() {
  console.log('🧠 WEBSTUDIO SKILL INTELLIGENCE SCAN');
  console.log('====================================\n');

  const report = {
    scan_timestamp: new Date().toISOString(),
    skill_intelligence_scan_ok: false,
    installedCount: 0,
    eligibleCount: null,
    missingRequirementsCount: null,
    clawhubSearchOk: false,
    recommendations: [],
    raw: {}
  };

  // 1. openclaw skills list --json
  console.log('1. Scanning installed skills...');
  const listResult = runCommand('openclaw skills list --json');
  const listJson = parseJsonSafe(listResult.output);
  if (listJson && Array.isArray(listJson.skills)) {
    report.installedCount = listJson.skills.length;
    report.raw.skillsList = listJson;
    console.log(`   ✅ Found ${report.installedCount} installed skills`);
  } else {
    // Fallback to text parsing
    const textResult = runCommand('openclaw skills list');
    const readyMatch = textResult.output.match(/Skills \((\d+)\/(\d+) ready\)/);
    if (readyMatch) {
      report.installedCount = parseInt(readyMatch[1], 10);
      console.log(`   ✅ Found ${report.installedCount} ready skills (text fallback)`);
    } else {
      console.log('   ⚠️ Could not parse skills list');
    }
    report.raw.skillsListText = textResult.output;
  }

  // 2. openclaw skills list --eligible --json
  console.log('2. Scanning eligible skills...');
  const eligibleResult = runCommand('openclaw skills list --eligible --json');
  const eligibleJson = parseJsonSafe(eligibleResult.output);
  if (eligibleJson && Array.isArray(eligibleJson.skills)) {
    report.eligibleCount = eligibleJson.skills.length;
    report.raw.eligibleList = eligibleJson;
    console.log(`   ✅ Found ${report.eligibleCount} eligible skills`);
  } else {
    // Fallback to text parsing
    const textResult = runCommand('openclaw skills list --eligible');
    const readyMatch = textResult.output.match(/Skills \((\d+)\/(\d+) ready\)/);
    if (readyMatch) {
      report.eligibleCount = parseInt(readyMatch[1], 10);
      console.log(`   ✅ Found ${report.eligibleCount} eligible skills (text fallback)`);
    } else {
      console.log('   ⚠️ Could not parse eligible skills');
    }
    report.raw.eligibleListText = textResult.output;
  }

  // 3. openclaw skills check --json
  console.log('3. Checking skills status...');
  const checkResult = runCommand('openclaw skills check --json');
  const checkJson = parseJsonSafe(checkResult.output);
  if (checkJson) {
    report.missingRequirementsCount = checkJson.missingRequirements || 0;
    report.raw.skillsCheck = checkJson;
    console.log(`   ✅ Missing requirements: ${report.missingRequirementsCount}`);
  } else {
    // Fallback to text parsing
    const textResult = runCommand('openclaw skills check');
    const missingMatch = textResult.output.match(/✗ Missing requirements: (\d+)/);
    if (missingMatch) {
      report.missingRequirementsCount = parseInt(missingMatch[1], 10);
      console.log(`   ✅ Missing requirements: ${report.missingRequirementsCount} (text fallback)`);
    } else {
      console.log('   ⚠️ Could not parse skills check');
    }
    report.raw.skillsCheckText = textResult.output;
  }

  // 4. openclaw skills search --limit 20 --json
  console.log('4. Searching ClawHub...');
  const searchResult = runCommand('openclaw skills search --limit 20 --json');
  const searchJson = parseJsonSafe(searchResult.output);
  if (searchJson && Array.isArray(searchJson.results)) {
    report.clawhubSearchOk = true;
    report.raw.clawhubSearch = searchJson;
    console.log(`   ✅ ClawHub search returned ${searchJson.results.length} results`);
  } else {
    console.log('   ⚠️ ClawHub search failed or returned empty');
    report.raw.clawhubSearchError = searchResult.stderr || searchResult.output;
  }

  // 5. Generate recommendations
  console.log('5. Generating recommendations...');
  if (report.missingRequirementsCount === 0 && report.eligibleCount >= 10) {
    report.recommendations.push({
      type: 'status',
      message: 'Skills health looks good. No missing requirements detected.'
    });
  }
  if (report.clawhubSearchOk) {
    report.recommendations.push({
      type: 'info',
      message: 'ClawHub search is operational. Use `openclaw skills search <query>` for task-specific skills.'
    });
  }

  // 6. Final status
  report.skill_intelligence_scan_ok = 
    report.installedCount > 0 && 
    report.eligibleCount !== null && 
    report.missingRequirementsCount !== null;

  // 7. Save report
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${REPORT_PATH}`);

  // 8. Print summary
  console.log('\n📊 SUMMARY');
  console.log(JSON.stringify({
    skill_intelligence_scan_ok: report.skill_intelligence_scan_ok,
    installedCount: report.installedCount,
    eligibleCount: report.eligibleCount,
    missingRequirementsCount: report.missingRequirementsCount,
    clawhubSearchOk: report.clawhubSearchOk,
    recommendations: report.recommendations
  }, null, 2));

  process.exit(report.skill_intelligence_scan_ok ? 0 : 1);
}

main();
