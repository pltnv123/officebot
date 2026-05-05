#!/usr/bin/env node
/**
 * WEBSTUDIO-PROJECT-ROUTER-SMOKE-001
 * 
 * Smoke test for Project Router:
 * 1. Analyze brief for script project
 * 2. Analyze brief for telegram_bot project
 * 3. Analyze brief for landing_page project
 * 4. Verify analysis returns expected fields
 * 5. Verify router page loads
 */

const http = require('http');

const DEMO_BASE = 'http://127.0.0.1:8787';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

function httpPostJson(url, body) {
  const postData = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const results = {
    ok: false,
    router_page_loaded: false,
    script_analysis_ok: false,
    telegram_bot_analysis_ok: false,
    landing_page_analysis_ok: false,
    errors: []
  };

  try {
    console.log('🧪 WEBSTUDIO PROJECT ROUTER SMOKE\n');

    // Step 1: Load router page
    console.log('1. Loading router page...');
    const routerPageRes = await httpGet(DEMO_BASE + '/webstudio/router');
    if (routerPageRes.status === 200 && routerPageRes.data.includes('Project Router')) {
      results.router_page_loaded = true;
      console.log('   ✅ Router page loaded');
    } else {
      results.errors.push('Router page failed: ' + routerPageRes.status);
      console.log('   ❌ Router page failed:', routerPageRes.status);
    }

    // Step 2: Analyze script brief
    console.log('\n2. Analyzing script brief...');
    const scriptRes = await httpPostJson(DEMO_BASE + '/api/demo/webstudio-order/analyze-brief', {
      brief: 'Сделай Python-скрипт, который читает CSV и считает сумму по колонке amount',
      project_type: 'script'
    });

    if (scriptRes.status === 201 || scriptRes.status === 200) {
      const scriptData = JSON.parse(scriptRes.data);
      if (scriptData.ok && scriptData.project_type === 'script' && scriptData.order_id) {
        results.script_analysis_ok = true;
        console.log('   ✅ Script analysis OK:', scriptData.order_id);
        console.log('      Project type:', scriptData.project_type);
        console.log('      Workflow:', scriptData.recommended_workflow);
        console.log('      Next action:', scriptData.next_action);
      } else {
        results.errors.push('Script analysis missing fields');
        console.log('   ❌ Script analysis missing fields');
      }
    } else {
      results.errors.push('Script analysis failed: ' + scriptRes.status);
      console.log('   ❌ Script analysis failed:', scriptRes.status);
    }

    // Step 3: Analyze telegram_bot brief
    console.log('\n3. Analyzing telegram_bot brief...');
    const telegramRes = await httpPostJson(DEMO_BASE + '/api/demo/webstudio-order/analyze-brief', {
      brief: 'Нужен Telegram-бот для сбора заявок с сайта: имя, email, телефон',
      project_type: 'telegram_bot'
    });

    if (telegramRes.status === 201 || telegramRes.status === 200) {
      const telegramData = JSON.parse(telegramRes.data);
      if (telegramData.ok && telegramData.project_type === 'telegram_bot' && telegramData.order_id) {
        results.telegram_bot_analysis_ok = true;
        console.log('   ✅ Telegram bot analysis OK:', telegramData.order_id);
        console.log('      Project type:', telegramData.project_type);
        console.log('      Workflow:', telegramData.recommended_workflow);
      } else {
        results.errors.push('Telegram analysis missing fields');
        console.log('   ❌ Telegram analysis missing fields');
      }
    } else {
      results.errors.push('Telegram analysis failed: ' + telegramRes.status);
      console.log('   ❌ Telegram analysis failed:', telegramRes.status);
    }

    // Step 4: Analyze landing_page brief
    console.log('\n4. Analyzing landing_page brief...');
    const landingRes = await httpPostJson(DEMO_BASE + '/api/demo/webstudio-order/analyze-brief', {
      brief: 'Сделай лендинг для сервиса по ремонту телефонов с формой заявки',
      project_type: 'landing_page'
    });

    if (landingRes.status === 201 || landingRes.status === 200) {
      const landingData = JSON.parse(landingRes.data);
      if (landingData.ok && landingData.project_type === 'landing_page' && landingData.order_id) {
        results.landing_page_analysis_ok = true;
        console.log('   ✅ Landing page analysis OK:', landingData.order_id);
        console.log('      Project type:', landingData.project_type);
        console.log('      Workflow:', landingData.recommended_workflow);
      } else {
        results.errors.push('Landing analysis missing fields');
        console.log('   ❌ Landing analysis missing fields');
      }
    } else {
      results.errors.push('Landing analysis failed: ' + landingRes.status);
      console.log('   ❌ Landing analysis failed:', landingRes.status);
    }

    // Final verdict
    results.ok = (
      results.router_page_loaded &&
      results.script_analysis_ok &&
      results.telegram_bot_analysis_ok &&
      results.landing_page_analysis_ok
    );

  } catch (err) {
    results.errors.push('Fatal: ' + err.message);
    console.log('   ❌ Fatal error:', err.message);
  }

  console.log('\n📊 RESULTS:');
  console.log(JSON.stringify(results, null, 2));

  process.exit(results.ok ? 0 : 1);
}

main();
