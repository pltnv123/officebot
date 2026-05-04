const fs = require('fs');
const path = require('path');
const http = require('http');

const ENV_FILE = path.join(process.env.HOME, '.openclaw', 'secrets', 'webstudio-supabase.env');
const STATE_URL = 'http://127.0.0.1:8787/api/state';

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

function hasSecretPatterns(text) {
  const secretPatterns = [
    /eyJ[A-Za-z0-9_-]+/, /sb_secret/i, /sb_publishable/i,
    /SUPABASE_SERVICE_ROLE_KEY/i, /SUPABASE_ANON_KEY/i,
    /apikey\s*[:=]/i, /Authorization\s*:/i,
  ];
  return secretPatterns.some(p => p.test(text));
}

async function check() {
  console.log('🧬 WEBSTUDIO ORGANISM MEMORY CHECK\n');
  let passed = 0, failed = 0;

  // 1. Check persistent env
  console.log('1. Persistent env file...');
  if (fs.existsSync(ENV_FILE)) {
    const stats = fs.statSync(ENV_FILE);
    const perms = (stats.mode & 0o777).toString(8);
    if (perms === '600') {
      console.log(`   ✅ ${ENV_FILE} (permissions ${perms})`);
      passed++;
    } else {
      console.log(`   ❌ Permissions are ${perms}, expected 600`);
      failed++;
    }
  } else {
    console.log(`   ❌ Missing: ${ENV_FILE}`);
    failed++;
  }

  // 2. Check not in /tmp
  console.log('2. Env not in /tmp...');
  if (ENV_FILE.includes('/tmp')) {
    console.log('   ❌ Env file is in /tmp (not persistent)');
    failed++;
  } else {
    console.log('   ✅ Env file is persistent (not in /tmp)');
    passed++;
  }

  // 3. Check /api/state
  console.log('3. /api/state JSON...');
  let state;
  try {
    const res = await request(STATE_URL);
    if (res.status !== 200) {
      console.log(`   ❌ HTTP ${res.status}`);
      failed++;
    } else {
      try {
        state = JSON.parse(res.data);
        console.log('   ✅ Valid JSON');
        passed++;
      } catch {
        console.log('   ❌ Not valid JSON');
        failed++;
      }
    }
  } catch (e) {
    console.log(`   ❌ Cannot fetch: ${e.message}`);
    failed++;
  }

  if (!state) {
    console.log('\n❌ ORGANISM MEMORY CHECK FAILED');
    process.exit(1);
  }

  // 4. Check supabase.configured
  console.log('4. supabase.configured...');
  if (state.supabase?.configured === true) {
    console.log('   ✅ true');
    passed++;
  } else {
    console.log(`   ❌ ${state.supabase?.configured || 'missing'}`);
    failed++;
  }

  // 5. Check supabase.restProbeOk
  console.log('5. supabase.restProbeOk...');
  if (state.supabase?.restProbeOk === true) {
    console.log('   ✅ true');
    passed++;
  } else {
    console.log(`   ❌ ${state.supabase?.restProbeOk || 'missing'}`);
    failed++;
  }

  // 6. Check supabase.probeStatus
  console.log('6. supabase.probeStatus...');
  if (state.supabase?.probeStatus === 200) {
    console.log('   ✅ 200');
    passed++;
  } else {
    console.log(`   ❌ ${state.supabase?.probeStatus || 'missing'}`);
    failed++;
  }

  // 7. Check no secrets
  console.log('7. No secrets leaked...');
  if (hasSecretPatterns(JSON.stringify(state))) {
    console.log('   ❌ Secret patterns detected');
    failed++;
  } else {
    console.log('   ✅ No secrets');
    passed++;
  }

  // Summary
  console.log(`\n===== SUMMARY =====`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n✅ ORGANISM MEMORY CHECK PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ ORGANISM MEMORY CHECK FAILED');
    process.exit(1);
  }
}

check();
