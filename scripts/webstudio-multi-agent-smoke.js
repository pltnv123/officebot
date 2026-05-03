#!/usr/bin/env node

/**
 * WEBSTUDIO-MULTIAGENT-001: Multi-Agent Spawn Smoke Test
 * 
 * Tests:
 * 1. Spawn planner agent
 * 2. Wait for result via sessions_yield
 * 3. Verify planner output contains milestones
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("WEBSTUDIO-MULTIAGENT-001: Multi-Agent Spawn Smoke Test");
  console.log("═══════════════════════════════════════════════════════════\n");

  const results = {
    ok: false,
    planner_spawn_ok: false,
    planner_response_ok: false,
    worker_spawn_ok: false,
    errors: []
  };

  try {
    // Test 1: Spawn planner agent
    console.log("1. Spawning planner agent...");
    const spawnCmd = `openclaw sessions spawn --task "List 3 milestones for adding script input support to WebStudio" --label "test-planner-smoke" --cwd /home/antonbot/.openclaw/workspace/office`;
    
    const spawnResult = await execAsync(spawnCmd, { timeout: 30000 });
    console.log("   ✅ Planner spawned");
    results.planner_spawn_ok = true;

    // Test 2: Wait for planner to complete (poll session)
    console.log("2. Waiting for planner response...");
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s for agent to respond

    // Test 3: Check session history
    console.log("3. Checking planner output...");
    const historyCmd = `openclaw sessions history --session-key "test-planner-smoke" --limit 5`;
    const historyResult = await execAsync(historyCmd, { timeout: 10000 });
    
    if (historyResult.stdout.includes("milestone")) {
      console.log("   ✅ Planner response contains milestones");
      results.planner_response_ok = true;
    } else {
      console.log("   ❌ Planner response missing milestones");
      results.errors.push("Planner response missing milestones");
    }

    // Test 4: Spawn worker agent
    console.log("4. Spawning worker agent...");
    const workerCmd = `openclaw sessions spawn --task "Write a simple Python script that prints Hello World" --label "test-worker-smoke" --cwd /home/antonbot/.openclaw/workspace/office`;
    
    const workerResult = await execAsync(workerCmd, { timeout: 30000 });
    console.log("   ✅ Worker spawned");
    results.worker_spawn_ok = true;

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.errors.push(error.message);
  }

  // Final result
  results.ok = results.planner_spawn_ok && results.planner_response_ok && results.worker_spawn_ok;

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("Results:");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`planner_spawn_ok: ${results.planner_spawn_ok ? '✅' : '❌'}`);
  console.log(`planner_response_ok: ${results.planner_response_ok ? '✅' : '❌'}`);
  console.log(`worker_spawn_ok: ${results.worker_spawn_ok ? '✅' : '❌'}`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Overall: ${results.ok ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("Final result:", JSON.stringify(results, null, 2));

  process.exit(results.ok ? 0 : 1);
}

main();
