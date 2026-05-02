#!/usr/bin/env node
/**
 * WebStudio Telegram Bot Editable Flow Smoke Test
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:8787';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function fetchBinary(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
  });
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)); } catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Running WebStudio Telegram Bot Editable Flow Smoke Test...\n');

  // Step 1: Check UI
  console.log('1. Check /webstudio/demo contains Telegram Bot Program Panel...');
  const demoPage = await fetchText(BASE_URL + '/webstudio/demo');
  assert(demoPage.includes('telegram-bot-program-panel'), 'telegram-bot-program-panel present');
  assert(demoPage.includes('Run Dry-Run'), 'Run Dry-Run button present');
  console.log('   Telegram Bot Program Panel UI present: ✅\n');

  // Step 2: Execute telegram bot and get artifact from library
  console.log('2. Execute telegram bot...');
  const executeResult = await postJson(BASE_URL + '/api/demo/webstudio-order/execute-telegram-bot', {
    brief: 'Telegram бот для приёма заявок: имя, телефон, услуга, сообщение. Сохранять все заявки в CSV файл.',
    tech_preference: 'python',
  });
  assert(executeResult.ok, 'execute telegram bot ok');
  
  const libraryResult = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifacts');
  assert(libraryResult.ok, 'library ok');
  const telegramArtifact = libraryResult.artifacts.filter(a => a.project_type === 'telegram_bot').sort((a,b) => b.created_at.localeCompare(a.created_at))[0];
  assert(telegramArtifact, 'telegram bot artifact found');
  const artifactId = telegramArtifact.project_artifact_id;
  const artifactRoot = telegramArtifact.artifact_root;
  console.log('   project_artifact_id:', artifactId);
  console.log('   Execute OK: ✅\n');

  // Step 3: GET versions - v0001 exists
  console.log('3. GET versions...');
  const versionsResult = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions');
  assert(versionsResult.ok, 'versions ok');
  const v0001Meta = versionsResult.versions.find(v => v.version_id === 'v0001');
  assert(v0001Meta, 'v0001 exists');
  assert(versionsResult.current_version_id === 'v0001', 'current_version_id v0001');
  
  // Load v0001 source
  const v0001SourceResult = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/version/v0001');
  assert(v0001SourceResult.ok, 'load v0001 ok');
  const v0001 = { ...v0001Meta, source: v0001SourceResult.source };
  console.log('   v0001 exists: ✅');
  console.log('   current_version_id: v0001 ✅\n');

  // Step 4: Run generated dry-run (reset CSV first)
  console.log('4. Run generated dry-run...');
  const csvPath = artifactRoot + '/applications.csv';
  fs.writeFileSync(csvPath, 'user_id,name,phone,service,message\n', 'utf8');
  
  const runResult1 = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run', {});
  assert(runResult1.ok, 'run generated ok');
  assert(runResult1.stdout, 'stdout exists');
  assert(runResult1.stdout.includes('Спасибо! Заявка сохранена.'), 'transcript contains confirmation');
  console.log('   Dry-run OK: ✅');
  console.log('   Transcript contains confirmation: ✅\n');

  // Step 5: Run edited unsaved bot
  console.log('5. Run edited unsaved bot...');
  const editedSource = v0001.source.replace('Спасибо! Заявка сохранена.', 'EDITED CONFIRMATION OK');
  fs.writeFileSync(csvPath, 'user_id,name,phone,service,message\n', 'utf8');
  const runResult2 = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run', { edited_source: editedSource });
  assert(runResult2.ok, 'run edited ok');
  assert(runResult2.stdout.includes('EDITED CONFIRMATION OK'), 'edited transcript contains edited string');
  console.log('   Edited dry-run OK: ✅');
  console.log('   Edited transcript contains edited string: ✅\n');

  // Step 6: Save edited bot (v0002)
  console.log('6. Save edited bot...');
  const saveResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/bot-version', {
    edited_source: editedSource,
  });
  assert(saveResult.ok, 'save ok');
  assert(saveResult.version_id === 'v0002', 'v0002 created');
  console.log('   v0002 created: ✅');
  
  const versionsAfterSave = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions');
  assert(versionsAfterSave.current_version_id === 'v0002', 'current_version_id v0002');
  console.log('   current_version_id: v0002 ✅\n');

  // Step 7: Restore v0001
  console.log('7. Restore v0001...');
  fs.writeFileSync(csvPath, 'user_id,name,phone,service,message\n', 'utf8');
  const restoreResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/bot-version/v0001/restore', {});
  assert(restoreResult.ok, 'restore ok');
  const versionsAfterRestore = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions');
  assert(versionsAfterRestore.current_version_id === 'v0001', 'current_version_id v0001 after restore');
  console.log('   v0001 restored: ✅');
  console.log('   current_version_id: v0001 ✅\n');

  // Step 8: Unsafe edit blocked
  console.log('8. Unsafe edit blocked...');
  const unsafeResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/bot-version', {
    edited_source: 'import os\nos.system("ls")',
  });
  assert(!unsafeResult.ok, 'unsafe edit blocked');
  assert(unsafeResult.error === 'edited_source_validation_failed', 'validation error');
  assert(unsafeResult.reason === 'unsafe_python_source', 'unsafe reason');
  console.log('   Unsafe edit blocked: ✅\n');

  // Step 9: Client delivery page with Run Dry-Run button
  console.log('9. Client delivery page contains Run Dry-Run, bot.py, and Download ZIP...');
  const clientDeliveryPage = await fetchText(BASE_URL + '/webstudio/delivery/' + encodeURIComponent(artifactId));
  assert(clientDeliveryPage.includes('Run Dry-Run'), 'Run Dry-Run button present');
  assert(clientDeliveryPage.includes('bot.py'), 'bot.py present');
  assert(clientDeliveryPage.includes('Download ZIP'), 'Download ZIP button present');
  assert(clientDeliveryPage.includes('Run history'), 'Run history section present');
  console.log('   Client delivery page OK: ✅\n');

  // Step 10: Telegram ZIP export
  console.log('10. Telegram ZIP export works...');
  const zipUrl = BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/download';
  const zipBuffer = await fetchBinary(zipUrl);
  assert(zipBuffer.length > 100, 'ZIP size > 100 bytes');
  assert(zipBuffer.slice(0, 2).toString('hex') === '504b', 'ZIP starts with PK signature');
  
  // Check ZIP contains expected files
  const { execSync } = require('child_process');
  const tmpZipPath = '/tmp/webstudio-telegram-zip-test.zip';
  fs.writeFileSync(tmpZipPath, zipBuffer);
  const zipList = execSync(`unzip -l "${tmpZipPath}"`, { encoding: 'utf8' });
  assert(zipList.includes('bot.py'), 'ZIP contains bot.py');
  assert(zipList.includes('dry_run_test.py'), 'ZIP contains dry_run_test.py');
  assert(zipList.includes('.env.example'), 'ZIP contains .env.example');
  assert(zipList.includes('applications.csv'), 'ZIP contains applications.csv');
  assert(zipList.includes('manifest.json'), 'ZIP contains manifest.json');
  fs.unlinkSync(tmpZipPath);
  
  console.log('   ZIP export OK: ✅');
  console.log('   ZIP contains bot.py: ✅');
  console.log('   ZIP contains dry_run_test.py: ✅');
  console.log('   ZIP contains .env.example: ✅');
  console.log('   ZIP contains applications.csv: ✅');
  console.log('   ZIP contains manifest.json: ✅\n');

  console.log('✅ All telegram bot editable flow smoke tests passed!\n');
  return { 
    ok: true, 
    telegram_bot_editable_flow_smoke_ok: true, 
    artifact_id: artifactId,
    telegram_bot_program_panel_ok: true,
    generated_v0001_ok: true,
    generated_dry_run_ok: true,
    edited_unsaved_dry_run_ok: true,
    save_v0002_ok: true,
    restore_v0001_ok: true,
    unsafe_edit_blocked_ok: true,
    client_delivery_run_dry_run_ok: true,
    telegram_zip_export_ok: true,
  };
}

main().then((result) => {
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
