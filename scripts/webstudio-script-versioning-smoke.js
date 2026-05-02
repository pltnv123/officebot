#!/usr/bin/env node
const assert = require('assert');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8787';

async function main() {
  console.log('Running WebStudio Script Versioning Smoke Test...');
  console.log('Base URL:', BASE_URL);
  
  // Step 1: Execute original script
  console.log('\n1. Execute original script...');
  const execResult = await fetch(BASE_URL + '/api/demo/webstudio-order/execute-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief: 'Сделай Python-скрипт, который печатает Hello World', tech_preference: 'python' }),
  }).then(r => r.json());
  
  assert(execResult.ok, 'execute-script ok');
  console.log('   artifact_id:', execResult.artifact_id);
  console.log('   project_artifact_id:', execResult.project_artifact_id);
  
  // Step 2: Run original
  console.log('\n2. Run original script...');
  const run1 = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(execResult.project_artifact_id) + '/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).then(r => r.json());
  
  assert(run1.ok, 'run1 ok');
  console.log('   stdout:', run1.stdout.trim());
  console.log('   run_id:', run1.run_id);
  
  // Step 3: Edit and run (creates version 1)
  console.log('\n3. Edit and run (creates version 1)...');
  const editedSource1 = 'print("Edited Version 1")';
  const run2 = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(execResult.project_artifact_id) + '/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edited_source: editedSource1 }),
  }).then(r => r.json());
  
  assert(run2.ok, 'run2 ok');
  assert(run2.stdout.includes('Edited Version 1'), 'run2 stdout matches edited');
  console.log('   stdout:', run2.stdout.trim());
  console.log('   run_id:', run2.run_id);
  
  // Step 4: Edit and run again (creates version 2)
  console.log('\n4. Edit and run again (creates version 2)...');
  const editedSource2 = 'print("Edited Version 2")';
  const run3 = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(execResult.project_artifact_id) + '/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ edited_source: editedSource2 }),
  }).then(r => r.json());
  
  assert(run3.ok, 'run3 ok');
  assert(run3.stdout.includes('Edited Version 2'), 'run3 stdout matches edited');
  console.log('   stdout:', run3.stdout.trim());
  console.log('   run_id:', run3.run_id);
  
  // Step 5: List versions
  console.log('\n5. List versions...');
  const versionsResult = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(execResult.project_artifact_id) + '/versions').then(r => r.json());
  
  assert(versionsResult.ok, 'list versions ok');
  assert(versionsResult.versions.length >= 2, 'at least 2 versions saved');
  console.log('   versions count:', versionsResult.versions.length);
  console.log('   versions:', versionsResult.versions.map(v => v.run_id.slice(-6)));
  
  // Step 6: Load version 1
  console.log('\n6. Load version 1...');
  const version1Id = versionsResult.versions.find(v => v.version_id === 'v0002')?.version_id || versionsResult.versions[0]?.version_id;
  if (version1Id) {
    const version1Result = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(execResult.project_artifact_id) + '/version/' + encodeURIComponent(version1Id)).then(r => r.json());
    assert(version1Result.ok, 'load version ok');
    assert(version1Result.source.includes('Edited'), 'version source contains edited content');
    console.log('   loaded version source:', version1Result.source.trim());
  } else {
    console.log('   WARNING: Could not find matching version ID');
  }
  
  // Step 7: Verify original script is restored
  console.log('\n7. Verify original script restored...');
  const run4 = await fetch(BASE_URL + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(execResult.project_artifact_id) + '/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).then(r => r.json());
  
  assert(run4.ok, 'run4 ok');
  assert(run4.stdout.includes('Hello WebStudio'), 'original script restored');
  console.log('   stdout:', run4.stdout.trim());
  
  console.log('\n✅ All versioning smoke tests passed!');
  
  return {
    ok: true,
    versioning_smoke_ok: true,
    versions_saved: versionsResult.versions.length,
    project_artifact_id: execResult.project_artifact_id,
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
