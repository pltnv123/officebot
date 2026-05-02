#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8787';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log('Running WebStudio Landing Editable Preview Smoke Test...\n');
  
  // Step 1: Check /webstudio/demo contains Landing Page Program Panel
  console.log('1. Check /webstudio/demo contains Landing Page Program Panel...');
  const demoPage = fs.readFileSync(path.join(__dirname, '..', 'backend', 'webStudioDemoPage.js'), 'utf8');
  const hasLandingPanel = demoPage.includes('landing-workflow-panel') || demoPage.includes('Landing Page');
  assert(hasLandingPanel, 'Landing Page UI present');
  console.log('   Landing Page UI present: ✅\n');
  
  // Step 2: Use existing landing artifact for testing
  console.log('2. Use existing landing artifact...');
  const orderId = 'ws-order-demo-landing-1777754638267';
  const artifactId = `ws-project-artifact-landing_page-${orderId}-premium_modern_landing`;
  const artifactRoot = `/home/antonbot/.openclaw/workspace/office/backend/controlPlane/storage/.first-governed-workflow-runtime/webstudio-landing-artifacts/${orderId}`;
  
  console.log('   artifact_id:', artifactId);
  assert(fs.existsSync(artifactRoot), 'Artifact exists');
  console.log('   Artifact exists: ✅\n');
  
  // Step 3: Check artifact registered (skip for now - no endpoint)
  console.log('3. Register artifact in library...');
  console.log('   Registration: (skipped - endpoint may not exist)\n');
  
  // Step 4: GET versions
  console.log('4. GET versions...');
  const versions = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions');
  assert(versions.ok, 'versions ok');
  assert(versions.versions && versions.versions.length > 0, 'v0001 exists');
  assert(versions.current_version_id, 'current_version_id exists');
  console.log('   v0001 exists: ✅');
  console.log('   current_version_id:', versions.current_version_id, '✅\n');
  
  // Step 5: Preview generated landing
  console.log('5. Preview generated landing...');
  const previewResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run', {});
  assert(previewResult.ok, 'preview ok');
  assert(previewResult.preview_route, 'preview_route exists');
  console.log('   Preview OK: ✅');
  console.log('   Preview route:', previewResult.preview_route, '\n');
  
  // Step 6: Preview edited unsaved landing
  console.log('6. Preview edited unsaved landing...');
  const initialHtml = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>Premium Landing</title></head>
<body>
  <h1>Hello WebStudio Landing</h1>
</body>
</html>`;
  const editedHtml = initialHtml.replace('Hello WebStudio Landing', 'EDITED LANDING OK');
  const previewEditedResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run', {
    edited_source: editedHtml,
    save_edited: false,
  });
  assert(previewEditedResult.ok, 'preview edited ok');
  // Check current index.html not overwritten
  const currentHtml = fs.readFileSync(artifactRoot + '/index.html', 'utf8');
  assert(!currentHtml.includes('EDITED LANDING OK'), 'current not overwritten');
  console.log('   Edited preview OK: ✅');
  console.log('   Current index.html not overwritten: ✅\n');
  
  // Step 7: Save edited landing
  console.log('7. Save edited landing...');
  const saveResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/landing-version', {
    edited_source: editedHtml,
    version_label: 'Edited test version',
  });
  assert(saveResult.ok, 'save ok');
  assert(saveResult.saved === true, 'saved flag true');
  console.log('   version_id:', saveResult.version_id);
  console.log('   Save OK: ✅\n');
  
  // Step 8: Verify current updated
  console.log('8. Verify current version updated...');
  const versionsAfterSave = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions');
  assert(versionsAfterSave.current_version_id === saveResult.version_id, 'current_version_id updated');
  const currentHtmlAfter = fs.readFileSync(artifactRoot + '/index.html', 'utf8');
  assert(currentHtmlAfter.includes('EDITED LANDING OK'), 'current updated');
  console.log('   current_version_id:', versionsAfterSave.current_version_id, '✅');
  console.log('   Current index.html updated: ✅\n');
  
  // Step 9: Restore v0001
  console.log('9. Restore v0001...');
  const restoreResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/landing-version/v0001/restore', {});
  assert(restoreResult.ok, 'restore ok');
  const versionsAfterRestore = await fetchJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions');
  assert(versionsAfterRestore.current_version_id === 'v0001', 'current_version_id v0001');
  const currentHtmlAfterRestore = fs.readFileSync(artifactRoot + '/index.html', 'utf8');
  assert(!currentHtmlAfterRestore.includes('EDITED LANDING OK'), 'current restored');
  console.log('   Restore OK: ✅');
  console.log('   current_version_id: v0001 ✅');
  console.log('   Current index.html restored: ✅\n');
  
  // Step 10: Unsafe HTML blocked
  console.log('10. Unsafe HTML blocked...');
  const unsafeHtml = `<html><body><script src="http://evil.com/evil.js"></script></body></html>`;
  const unsafeResult = await postJson(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run', {
    edited_source: unsafeHtml,
    save_edited: false,
  });
  assert(!unsafeResult.ok || unsafeResult.qa_summary?.no_external_scripts === false, 'unsafe blocked or flagged');
  console.log('   Unsafe HTML blocked/flagged: ✅\n');
  
  console.log('✅ All landing editable preview smoke tests passed!');
}

main().catch((error) => {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
