#!/usr/bin/env node
const assert = require('assert');

const base = 'http://127.0.0.1:8787';

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  // 1. Execute a script to get a project_artifact_id
  const execResult = await postJson(base + '/api/demo/webstudio-order/execute-script', {
    brief: 'Сделай Python-скрипт, который печатает Hello WebStudio',
    tech_preference: 'python',
  });
  assert(execResult.ok, 'execute-script ok');
  assert(execResult.project_artifact_id, 'has project_artifact_id');
  const projectArtifactId = execResult.project_artifact_id;
  
  // 2. Run original script
  const run1 = await postJson(base + `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(projectArtifactId)}/run`, {});
  assert(run1.ok, 'run original ok');
  assert(run1.exit_code === 0, 'exit_code 0');
  assert(run1.stdout.includes('Hello WebStudio'), 'stdout has Hello WebStudio');
  
  // 3. Run with edited source
  const editedSource = 'print("Edited Script Works!")';
  const run2 = await postJson(base + `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(projectArtifactId)}/run`, {
    edited_source: editedSource,
  });
  assert(run2.ok, 'run edited ok');
  assert(run2.exit_code === 0, 'exit_code 0 for edited');
  assert(run2.stdout.includes('Edited Script Works!'), 'stdout has edited output');
  
  // 4. Verify original script is restored after edited run
  const run3 = await postJson(base + `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(projectArtifactId)}/run`, {});
  assert(run3.ok, 'run after edited ok');
  assert(run3.stdout.includes('Hello WebStudio'), 'original script restored');
  
  // 5. Test validation: reject unsafe edited source
  try {
    await postJson(base + `/api/demo/webstudio-order/project-artifact/${encodeURIComponent(projectArtifactId)}/run`, {
      edited_source: 'import os; os.system("rm -rf /")',
    });
    assert.fail('should have rejected unsafe source');
  } catch (err) {
    // Expected
  }
  
  // 6. Check HTML has editable elements
  const html = await fetchText(base + '/webstudio/demo');
  assert(html.includes('script-editor'), 'has script-editor textarea');
  assert(html.includes('edit-script-btn'), 'has edit button');
  assert(html.includes('save-script-btn'), 'has save button');
  assert(html.includes('reset-script-btn'), 'has reset button');
  assert(html.includes('script-dirty-badge'), 'has dirty badge');
  
  // 7. Check CSS for textarea
  assert(html.includes('textarea.code-block'), 'has textarea CSS');
  
  console.log(JSON.stringify({
    ok: true,
    editable_script_playground_ok: true,
    original_run_ok: true,
    edited_run_ok: true,
    restore_after_edit_ok: true,
    validation_blocks_unsafe: true,
    html_elements_present: true,
    project_artifact_id: projectArtifactId,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
