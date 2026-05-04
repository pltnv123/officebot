const http = require('http');

const STATE_URL = 'http://127.0.0.1:8787/api/state';

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

function hasSecretPatterns(text) {
  const secretPatterns = [
    /eyJ[A-Za-z0-9_-]+/, // JWT
    /sb_secret/i,
    /sb_publishable/i,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /SUPABASE_ANON_KEY/i,
    /apikey\s*[:=]/i,
    /Authorization\s*:/i,
  ];
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) return true;
  }
  return false;
}

async function main() {
  console.log('🧬 WEBSTUDIO-ORGANISM-MEMORY SMOKE\n');

  // 1. GET /api/state
  console.log('1. Fetching /api/state...');
  let response;
  try {
    response = await request(STATE_URL);
  } catch (error) {
    console.error('❌ FAIL: Cannot fetch /api/state:', error.message);
    console.log(JSON.stringify({
      organism_memory_smoke_ok: false,
      api_state_json_ok: false,
      error: error.message
    }, null, 2));
    process.exit(1);
  }

  console.log(`   HTTP ${response.status}`);

  // 2. HTTP 200
  if (response.status !== 200) {
    console.error('❌ FAIL: HTTP status is not 200');
    console.log(JSON.stringify({
      organism_memory_smoke_ok: false,
      api_state_json_ok: false,
      http_status: response.status
    }, null, 2));
    process.exit(1);
  }
  console.log('   ✅ HTTP 200');

  // 3. Parse JSON
  let state;
  try {
    state = JSON.parse(response.data);
  } catch (error) {
    console.error('❌ FAIL: Cannot parse JSON:', error.message);
    console.log(JSON.stringify({
      organism_memory_smoke_ok: false,
      api_state_json_ok: false,
      error: error.message
    }, null, 2));
    process.exit(1);
  }
  console.log('   ✅ Valid JSON');

  // 4. Check ok: true
  if (state.ok !== true) {
    console.error('❌ FAIL: state.ok is not true');
    console.log(JSON.stringify({ organism_memory_smoke_ok: false, state }, null, 2));
    process.exit(1);
  }
  console.log('   ✅ ok: true');

  // 5. Check source includes supabase
  if (!state.source || !state.source.toLowerCase().includes('supabase')) {
    console.error('❌ FAIL: source does not include supabase');
    console.log(JSON.stringify({ organism_memory_smoke_ok: false, source: state.source }, null, 2));
    process.exit(1);
  }
  console.log(`   ✅ source: ${state.source}`);

  // 6. Check supabase.configured
  if (!state.supabase || state.supabase.configured !== true) {
    console.error('❌ FAIL: supabase.configured is not true');
    console.log(JSON.stringify({ organism_memory_smoke_ok: false, supabase: state.supabase }, null, 2));
    process.exit(1);
  }
  console.log('   ✅ supabase.configured: true');

  // 7. Check supabase.restProbeOk
  if (state.supabase.restProbeOk !== true) {
    console.error('❌ FAIL: supabase.restProbeOk is not true');
    console.log(JSON.stringify({ organism_memory_smoke_ok: false, supabase: state.supabase }, null, 2));
    process.exit(1);
  }
  console.log('   ✅ supabase.restProbeOk: true');

  // 8. Check supabase.probeStatus
  if (state.supabase.probeStatus !== 200) {
    console.error('❌ FAIL: supabase.probeStatus is not 200');
    console.log(JSON.stringify({ organism_memory_smoke_ok: false, supabase: state.supabase }, null, 2));
    process.exit(1);
  }
  console.log('   ✅ supabase.probeStatus: 200');

  // 9. Check no secrets leaked
  if (hasSecretPatterns(response.data)) {
    console.error('❌ FAIL: Secret patterns detected in /api/state response');
    console.log(JSON.stringify({ organism_memory_smoke_ok: false, secrets_leaked: true }, null, 2));
    process.exit(1);
  }
  console.log('   ✅ No secrets leaked');

  // 10. Summary
  console.log('\n✅ ALL CHECKS PASSED\n');
  console.log(JSON.stringify({
    organism_memory_smoke_ok: true,
    api_state_json_ok: true,
    supabase_configured: true,
    supabase_rest_probe_ok: true,
    secrets_leaked: false
  }, null, 2));

  process.exit(0);
}

main();
