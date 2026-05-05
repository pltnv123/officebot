#!/usr/bin/env node
/**
 * WEBSTUDIO-RUNTIME-OWNER-GUARD-SMOKE-001
 * 
 * Verifies that WebStudio runtime is owned by systemd service:
 * 1. webstudio-demo.service is active
 * 2. Service MainPID exists
 * 3. Port 8787 owner PID exists
 * 4. Port owner PID equals service MainPID
 * 5. Process env contains SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * 6. /api/state ok=true
 * 7. supabase.restProbeOk=true
 * 8. Organism smoke passes
 */

const { execSync } = require('child_process');
const http = require('http');

const DEMO_BASE = 'http://127.0.0.1:8787';
const WEBSTUDIO_SERVICE = 'webstudio-demo.service';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const results = {
    ok: false,
    service_active: false,
    service_main_pid: null,
    port_owner_pid: null,
    pids_match: false,
    process_has_supabase_env: false,
    api_state_ok: false,
    supabase_rest_probe_ok: false,
    organism_smoke_ok: false,
    errors: []
  };

  try {
    console.log('🧪 WEBSTUDIO RUNTIME OWNER GUARD SMOKE\n');

    // Step 1: Check service is active
    console.log('1. Checking webstudio-demo.service status...');
    const serviceStatus = exec(`systemctl --user is-active ${WEBSTUDIO_SERVICE}`);
    if (serviceStatus === 'active') {
      results.service_active = true;
      console.log('   ✅ Service active');
    } else {
      results.errors.push(`Service not active: ${serviceStatus}`);
      console.log('   ❌ Service not active:', serviceStatus);
    }

    // Step 2: Get service MainPID
    console.log('\n2. Getting service MainPID...');
    const serviceMainPid = exec(`systemctl --user show ${WEBSTUDIO_SERVICE} -p MainPID --value`);
    if (serviceMainPid && serviceMainPid !== '' && serviceMainPid !== '0') {
      results.service_main_pid = serviceMainPid;
      console.log('   ✅ Service MainPID:', serviceMainPid);
    } else {
      results.errors.push('Service MainPID not found');
      console.log('   ❌ Service MainPID not found');
    }

    // Step 3: Get port 8787 owner PID
    console.log('\n3. Getting port 8787 owner PID...');
    const ssOutput = exec('ss -ltnp 2>/dev/null | grep ":8787" || true');
    if (ssOutput) {
      const pidMatch = ssOutput.match(/pid=(\d+)/);
      if (pidMatch && pidMatch[1]) {
        results.port_owner_pid = pidMatch[1];
        console.log('   ✅ Port 8787 owner PID:', pidMatch[1]);
      } else {
        results.errors.push('Could not parse port owner PID from ss output');
        console.log('   ❌ Could not parse port owner PID');
        console.log('   ss output:', ssOutput);
      }
    } else {
      results.errors.push('Port 8787 not listening');
      console.log('   ❌ Port 8787 not listening');
    }

    // Step 4: Compare PIDs
    console.log('\n4. Comparing PIDs...');
    if (results.service_main_pid && results.port_owner_pid) {
      if (results.service_main_pid === results.port_owner_pid) {
        results.pids_match = true;
        console.log('   ✅ PIDs match:', results.service_main_pid);
      } else {
        results.errors.push(`PID mismatch: service=${results.service_main_pid}, port=${results.port_owner_pid}`);
        console.log('   ❌ PID mismatch:');
        console.log('      Service PID:', results.service_main_pid);
        console.log('      Port owner PID:', results.port_owner_pid);
      }
    }

    // Step 5: Check process env for Supabase vars
    console.log('\n5. Checking process env for Supabase vars...');
    if (results.port_owner_pid) {
      const procEnviron = exec(`cat /proc/${results.port_owner_pid}/environ 2>/dev/null | tr '\\0' '\\n' | grep -E "^SUPABASE_" | sort || true`);
      if (procEnviron) {
        const envVars = procEnviron.split('\n').filter(line => line.trim());
        const hasUrl = envVars.some(v => v.startsWith('SUPABASE_URL='));
        const hasAnon = envVars.some(v => v.startsWith('SUPABASE_ANON_KEY='));
        const hasServiceRole = envVars.some(v => v.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
        
        if (hasUrl && hasAnon && hasServiceRole) {
          results.process_has_supabase_env = true;
          console.log('   ✅ Process has all Supabase env vars');
          console.log('      SUPABASE_URL=<redacted>');
          console.log('      SUPABASE_ANON_KEY=<redacted>');
          console.log('      SUPABASE_SERVICE_ROLE_KEY=<redacted>');
        } else {
          results.errors.push('Process missing Supabase env vars');
          console.log('   ❌ Process missing Supabase env vars:');
          console.log('      Has SUPABASE_URL:', hasUrl);
          console.log('      Has SUPABASE_ANON_KEY:', hasAnon);
          console.log('      Has SUPABASE_SERVICE_ROLE_KEY:', hasServiceRole);
        }
      } else {
        results.errors.push('Could not read process environ');
        console.log('   ❌ Could not read process environ');
      }
    }

    // Step 6: Check /api/state
    console.log('\n6. Checking /api/state...');
    const stateRes = await httpGet(DEMO_BASE + '/api/state');
    if (stateRes.status === 200) {
      try {
        const stateData = JSON.parse(stateRes.data);
        if (stateData.ok === true) {
          results.api_state_ok = true;
          console.log('   ✅ /api/state ok=true');
        } else {
          results.errors.push('/api/state ok=false');
          console.log('   ❌ /api/state ok=false');
        }
        
        // Step 7: Check supabase.restProbeOk
        if (stateData.supabase?.restProbeOk === true) {
          results.supabase_rest_probe_ok = true;
          console.log('   ✅ supabase.restProbeOk=true');
        } else {
          results.errors.push('supabase.restProbeOk=false');
          console.log('   ❌ supabase.restProbeOk=false');
        }
      } catch (err) {
        results.errors.push('Failed to parse /api/state: ' + err.message);
        console.log('   ❌ Failed to parse /api/state:', err.message);
      }
    } else {
      results.errors.push('/api/state failed: ' + stateRes.status);
      console.log('   ❌ /api/state failed:', stateRes.status);
    }

    // Step 8: Run organism smoke
    console.log('\n7. Running organism smoke...');
    const smokeResult = exec('cd /home/antonbot/.openclaw/workspace/office && node scripts/webstudio-organism-memory-smoke.js 2>&1');
    if (smokeResult && (smokeResult.includes('ALL CHECKS PASSED') || smokeResult.includes('organism_memory_smoke_ok": true'))) {
      results.organism_smoke_ok = true;
      console.log('   ✅ Organism smoke passed');
    } else {
      results.errors.push('Organism smoke failed');
      console.log('   ❌ Organism smoke failed');
      if (smokeResult) {
        console.log('   Output:', smokeResult.substring(0, 500));
      }
    }

  } catch (err) {
    results.errors.push('Fatal: ' + err.message);
    console.log('   ❌ Fatal error:', err.message);
  }

  // Final verdict
  results.ok = (
    results.service_active &&
    results.service_main_pid !== null &&
    results.port_owner_pid !== null &&
    results.pids_match &&
    results.process_has_supabase_env &&
    results.api_state_ok &&
    results.supabase_rest_probe_ok &&
    results.organism_smoke_ok
  );

  console.log('\n📊 RESULTS:');
  console.log(JSON.stringify(results, null, 2));

  process.exit(results.ok ? 0 : 1);
}

main();
