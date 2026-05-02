const assert = require('assert');

async function readJson(url, options = {}) {
  const response = await fetch(url, options);
  const json = await response.json();
  return { response, json };
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  return { response, json };
}

async function main() {
  const base = 'http://127.0.0.1:8787';

  // 1. Check /webstudio/demo HTML contains Run Script UI contract
  const demoHtml = await fetch(base + '/webstudio/demo').then(r => r.text());
  assert(demoHtml.includes('run-script-btn'), 'main page has run-script-btn');
  assert(demoHtml.includes('script-run-result-panel'), 'main page has script-run-result-panel');
  assert(demoHtml.includes('runScriptOnMainPage'), 'main page has runScriptOnMainPage function');
  assert(demoHtml.includes('renderScriptRunResult'), 'main page has renderScriptRunResult function');

  // 2. Execute Script MVP
  const { response: execResponse, json: execJson } = await postJson(base + '/api/demo/webstudio-order/execute-script', {
    brief: 'Сделай Python-скрипт, который печатает числа от 1 до 5',
    tech_preference: 'python',
  });
  assert.strictEqual(execResponse.status, 201, 'execute-script status');
  assert.strictEqual(execJson.ok, true, 'execute-script ok');
  assert(execJson.project_artifact_id, 'execute-script returns project_artifact_id');
  assert(execJson.order_id, 'execute-script returns order_id');
  assert(execJson.scenario, 'execute-script returns scenario');

  const projectArtifactId = execJson.project_artifact_id;
  const orderId = execJson.order_id;

  // 3. Run script via main page endpoint
  const { response: runResponse, json: runJson } = await postJson(base + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(projectArtifactId) + '/run', {});
  assert.strictEqual(runResponse.status, 200, 'main run endpoint status');
  assert.strictEqual(runJson.ok, true, 'main run endpoint ok');
  assert(runJson.exit_code != null, 'run returns exit_code');
  assert(runJson.duration_ms != null, 'run returns duration_ms');
  assert(runJson.stdout != null, 'run returns stdout');

  // 4. Check run-history after main run
  const { response: historyResponse, json: historyJson } = await readJson(base + '/api/demo/webstudio-order/project-artifact/' + encodeURIComponent(projectArtifactId) + '/run-history');
  assert.strictEqual(historyResponse.status, 200, 'run-history status');
  assert.strictEqual(historyJson.ok, true, 'run-history ok');
  assert(historyJson.run_count >= 1, 'run-history has at least 1 run');

  // 5. Check artifact library metadata after main run
  const { response: artifactsResponse, json: artifactsJson } = await readJson(base + '/api/demo/webstudio-order/project-artifacts');
  assert.strictEqual(artifactsResponse.status, 200, 'artifact-library status');
  assert(artifactsJson.ok, 'artifact-library ok');
  const artifact = artifactsJson.artifacts.find(a => a.project_artifact_id === projectArtifactId);
  assert(artifact, 'artifact found in library');
  assert(artifact.run_count >= 1, 'artifact has run_count >= 1');
  assert(artifact.last_run_status === 'ok', 'artifact last_run_status is ok');

  console.log(JSON.stringify({
    ok: true,
    main_page_run_ui_contract_ok: true,
    execute_script_returns_project_artifact_id: true,
    main_run_endpoint_ok: true,
    run_history_after_main_run_ok: true,
    artifact_library_metadata_after_main_run_ok: true,
    project_artifact_id: projectArtifactId,
    order_id: orderId,
    run_count: historyJson.run_count,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
