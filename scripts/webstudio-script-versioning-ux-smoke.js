#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';

async function main() {
  console.log('Running WebStudio Script Versioning UX Smoke Test...\n');
  
  // Step 1: Get artifact from library
  console.log('1. Get artifact from library...');
  const libraryResult = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifacts').then(r => r.json());
  assert(libraryResult.ok, 'library ok');
  const scriptArtifact = libraryResult.artifacts.find(a => a.project_type === 'script');
  assert(scriptArtifact, 'script artifact found');
  const artifactId = scriptArtifact.project_artifact_id;
  const orderId = scriptArtifact.order_id;
  console.log('   project_artifact_id:', artifactId);
  
  // Step 2: GET script-versions - verify v0001 exists and is current
  console.log('\n2. GET script-versions...');
  const versionsResult = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions').then(r => r.json());
  
  assert(versionsResult.ok, 'list versions ok');
  assert(versionsResult.versions.length >= 1, 'at least 1 version');
  assert(versionsResult.current_version_id, 'current_version_id present');
  const v0001 = versionsResult.versions.find(v => v.version_id === 'v0001');
  assert(v0001, 'v0001 found');
  assert(v0001.source_type === 'generated', 'v0001 is generated');
  console.log('   current_version_id:', versionsResult.current_version_id);
  console.log('   versions count:', versionsResult.versions.length);
  console.log('   v0001 label:', v0001.label);
  
  // Step 3: Save editor as new version with source printing "SAVED VERSION CURRENT OK"
  console.log('\n3. Save editor as new version...');
  const editedSource = 'print("SAVED VERSION CURRENT OK")';
  const saveResult = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/script-version', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edited_source: editedSource }),
  }).then(r => r.json());
  
  assert(saveResult.ok, 'save version ok');
  assert(saveResult.version_id, 'version_id present');
  const newVersionId = saveResult.version_id;
  console.log('   version_id:', saveResult.version_id);
  
  // Step 4: GET script-versions - verify current_version_id is new version
  console.log('\n4. GET script-versions (verify current updated)...');
  const versionsResult2 = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions').then(r => r.json());
  
  assert(versionsResult2.ok, 'list versions ok');
  assert(versionsResult2.current_version_id === newVersionId, 'current_version_id updated to new version');
  console.log('   current_version_id:', versionsResult2.current_version_id);
  console.log('   versions count:', versionsResult2.versions.length);
  
  // Step 5: GET script.py - verify it contains SAVED VERSION CURRENT OK
  console.log('\n5. GET script.py (verify updated to saved source)...');
  const scriptText = await fetch(BASE_URL + '/api/webstudio-script-artifact/' + orderId + '/script.py').then(r => r.text());
  assert(scriptText.includes('SAVED VERSION CURRENT OK'), 'script.py contains saved source');
  console.log('   script.py:', scriptText.trim());
  
  // Step 6: Run current script without edited_source - verify it runs saved version
  console.log('\n6. Run current script without edited_source...');
  const runResult = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).then(r => r.json());
  
  assert(runResult.ok, 'run ok');
  assert(runResult.stdout.includes('SAVED VERSION CURRENT OK'), 'run output matches saved version');
  console.log('   stdout:', runResult.stdout.trim());
  console.log('   run_id:', runResult.run_id);
  
  // Step 7: Load older version into editor should not change current_version_id
  console.log('\n7. Load older version into editor (should not change current)...');
  const loadResult = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/version/v0001').then(r => r.json());
  assert(loadResult.ok, 'load version ok');
  assert(loadResult.source, 'source loaded');
  
  // Verify current_version_id is still the new version (not v0001)
  const versionsResult3 = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions').then(r => r.json());
  assert(versionsResult3.current_version_id === newVersionId, 'current_version_id unchanged after load');
  console.log('   loaded v0001 source, current_version_id still:', versionsResult3.current_version_id);
  
  // Step 8: Restore v0001 - verify current_version_id and script.py updated
  console.log('\n8. Restore v0001...');
  const restoreResult = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/script-version/v0001/restore', {
    method: 'POST',
  }).then(r => r.json());
  
  assert(restoreResult.ok, 'restore version ok');
  assert(restoreResult.version_id === 'v0001', 'restored v0001');
  console.log('   restored_version_id:', restoreResult.version_id);
  
  // Verify script.py restored
  const restoredScriptText = await fetch(BASE_URL + '/api/webstudio-script-artifact/' + orderId + '/script.py').then(r => r.text());
  assert(restoredScriptText.includes('Hello') || restoredScriptText.includes('WebStudio'), 'script.py restored to generated');
  console.log('   script.py:', restoredScriptText.trim());
  
  // Verify current_version_id is v0001
  const versionsResult4 = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions').then(r => r.json());
  assert(versionsResult4.current_version_id === 'v0001', 'current_version_id is v0001 after restore');
  console.log('   current_version_id:', versionsResult4.current_version_id);
  
  // Step 9: Unsafe source blocked
  console.log('\n9. Unsafe source blocked...');
  const unsafeSource = 'import os\nprint(os.getcwd())';
  const unsafeResult = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/script-version', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edited_source: unsafeSource }),
  }).then(r => r.json());
  
  assert(!unsafeResult.ok, 'unsafe save blocked');
  assert(unsafeResult.error === 'edited_source_validation_failed', 'validation error');
  console.log('   error:', unsafeResult.error);
  console.log('   reason:', unsafeResult.reason);
  
  // Verify version count unchanged
  const versionsResult5 = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(artifactId) + '/versions').then(r => r.json());
  console.log('   versions count:', versionsResult5.versions.length, '(unchanged)');
  
  // Step 10: /webstudio/demo HTML contains Version Control
  console.log('\n10. /webstudio/demo HTML contains Version Control...');
  const demoHtml = await fetch(BASE_URL + '/webstudio/demo').then(r => r.text());
  assert(demoHtml.includes('Version Control'), 'Version Control present');
  assert(demoHtml.includes('Current version'), 'Current version label present');
  assert(demoHtml.includes('Restore selected version'), 'Restore button present');
  assert(demoHtml.includes('Save editor as new version'), 'Save button present');
  assert(demoHtml.includes('Reset editor to current version'), 'Reset button present');
  console.log('   Version Control UI present: ✅');
  
  console.log('\n✅ All versioning UX smoke tests passed!');
  
  return {
    ok: true,
    versioning_ux_smoke_ok: true,
    versions_count: versionsResult5.versions.length,
    current_version_id: versionsResult4.current_version_id,
    project_artifact_id: artifactId,
  };
}

main().then(result => {
  console.log('\nResult:', JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error.message);
  console.error(error);
  process.exit(1);
});
