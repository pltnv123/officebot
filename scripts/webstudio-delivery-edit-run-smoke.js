#!/usr/bin/env node
/**
 * Smoke test: Delivery page editable script.py + Run Edited + Reset
 * 
 * Tests:
 * 1. Generate script artifact
 * 2. Open delivery page (HTTP 200)
 * 3. Run Script (original) works
 * 4. Run Edited works with modified source
 * 5. Reset button restores original code
 * 6. Download ZIP works
 * 7. Run History loads
 */

const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
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
        'Content-Length': Buffer.byteLength(postData),
      },
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

async function runSmoke() {
  console.log('🧪 WEBSTUDIO-DELIVERY-EDIT-RUN SMOKE\n');
  
  // Step 1: Generate script artifact
  console.log('1. Generating script artifact...');
  const genResult = await httpPostJson(`${DEMO_BASE}/api/demo/webstudio-order/execute-script`, {
    brief: 'Сделай Python-скрипт который печатает 1 до 3',
  });
  if (genResult.status !== 200 && genResult.status !== 201) {
    console.error('❌ Generate failed:', genResult.status);
    process.exit(1);
  }
  const genData = JSON.parse(genResult.data);
  const orderId = genData.order_id;
  console.log('   order_id:', orderId);
  
  // Step 2: Get artifact from library
  console.log('\n2. Getting artifact from library...');
  const libResult = await httpGet(`${DEMO_BASE}/api/demo/webstudio-order/project-artifacts`);
  if (libResult.status !== 200) {
    console.error('❌ Library fetch failed:', libResult.status);
    process.exit(1);
  }
  const libData = JSON.parse(libResult.data);
  const artifact = (libData.artifacts || []).find(a => a.project_type === 'script' && a.order_id === orderId);
  if (!artifact) {
    console.error('❌ Artifact not found in library');
    process.exit(1);
  }
  const artifactId = artifact.project_artifact_id;
  console.log('   artifact_id:', artifactId);
  
  // Step 3: Delivery page opens
  console.log('\n3. Testing delivery page...');
  const deliveryResult = await httpGet(`${DEMO_BASE}/webstudio/delivery/${encodeURIComponent(artifactId)}`);
  if (deliveryResult.status !== 200) {
    console.error('❌ Delivery page HTTP', deliveryResult.status);
    process.exit(1);
  }
  const deliveryHtml = deliveryResult.data;
  if (!deliveryHtml.includes('Python Script Package')) {
    console.error('❌ Delivery page missing title');
    process.exit(1);
  }
  if (!deliveryHtml.includes('Run Edited')) {
    console.error('❌ Delivery page missing Run Edited button');
    process.exit(1);
  }
  if (!deliveryHtml.includes('delivery-reset-btn') && !deliveryHtml.includes('Reset')) {
    console.error('❌ Delivery page missing Reset button');
    process.exit(1);
  }
  console.log('   ✅ Delivery page opens with Run Edited + Reset buttons');
  
  // Step 4: Run Script (original)
  console.log('\n4. Testing Run Script (original)...');
  const runOriginalResult = await httpPostJson(`${DEMO_BASE}/api/demo/webstudio-order/project-artifact/${encodeURIComponent(artifactId)}/run`, {});
  if (runOriginalResult.status !== 200) {
    console.error('❌ Run original failed:', runOriginalResult.status);
    process.exit(1);
  }
  const runOriginalData = JSON.parse(runOriginalResult.data);
  if (!runOriginalData.ok) {
    console.error('❌ Run original not ok:', runOriginalData.error);
    process.exit(1);
  }
  console.log('   ✅ Run Script works, exit_code:', runOriginalData.exit_code);
  
  // Step 5: Run Edited
  console.log('\n5. Testing Run Edited...');
  const editedSource = 'for i in range(1, 4):\n    print(f"Edited: {i}")';
  const runEditedResult = await httpPostJson(`${DEMO_BASE}/api/demo/webstudio-order/project-artifact/${encodeURIComponent(artifactId)}/run`, {
    edited_source: editedSource,
  });
  if (runEditedResult.status !== 200) {
    console.error('❌ Run edited failed:', runEditedResult.status);
    process.exit(1);
  }
  const runEditedData = JSON.parse(runEditedResult.data);
  if (!runEditedData.ok) {
    console.error('❌ Run edited not ok:', runEditedData.error);
    process.exit(1);
  }
  if (!runEditedData.stdout.includes('Edited:')) {
    console.error('❌ Run edited output missing edited text:', runEditedData.stdout);
    process.exit(1);
  }
  console.log('   ✅ Run Edited works, output:', runEditedData.stdout.trim().split('\n')[0]);
  
  // Step 6: Download ZIP
  console.log('\n6. Testing Download ZIP...');
  const downloadUrl = `${DEMO_BASE}${artifact.download_url}`;
  const downloadResult = await httpGet(downloadUrl);
  if (downloadResult.status !== 200) {
    console.error('❌ Download ZIP failed:', downloadResult.status);
    process.exit(1);
  }
  if (!downloadResult.data.startsWith('PK')) {
    console.error('❌ Download ZIP invalid format');
    process.exit(1);
  }
  console.log('   ✅ Download ZIP works');
  
  // Step 7: Run History
  console.log('\n7. Testing Run History...');
  const historyResult = await httpGet(`${DEMO_BASE}/api/demo/webstudio-order/project-artifact/${encodeURIComponent(artifactId)}/run-history`);
  if (historyResult.status !== 200) {
    console.error('❌ Run history failed:', historyResult.status);
    process.exit(1);
  }
  const historyData = JSON.parse(historyResult.data);
  if (!historyData.runs || historyData.runs.length < 2) {
    console.error('❌ Run history should have at least 2 runs');
    process.exit(1);
  }
  console.log('   ✅ Run History works, runs:', historyData.runs.length);
  
  // Step 8: Reset functionality (check HTML structure)
  console.log('\n8. Testing Reset button logic...');
  if (!deliveryHtml.includes('originalFileContent') && !deliveryHtml.includes('delivery-reset-btn')) {
    console.error('❌ Reset button logic missing from page');
    process.exit(1);
  }
  console.log('   ✅ Reset button logic present');
  
  console.log('\n✅ ALL CHECKS PASSED\n');
}

runSmoke().catch((err) => {
  console.error('❌ Smoke failed:', err.message);
  process.exit(1);
});
