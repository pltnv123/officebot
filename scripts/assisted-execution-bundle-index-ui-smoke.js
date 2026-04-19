const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionBundleIndexLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="assisted-index-panel"') && html.includes('id="assisted-index-publishing"') && html.includes('id="assisted-index-payload"'),
  clientWiring: js.includes("const assistedIndexPanelEl = document.getElementById('assisted-index-panel');") && js.includes('function renderAssistedIndexPanel()') && js.includes('lastClientPayload?.assisted_execution_bundle_index'),
  renderFields: js.includes('surfaces: ${Object.keys(bundleIndex.surfaces || {}).join') && js.includes('publishing_map: recommended=') && js.includes('distribution: ${(p.distribution_map || []).join'),
  serverWiring: server.includes('enriched.assisted_execution_bundle_index = buildAssistedExecutionBundleIndex({') && server.includes("app.get('/api/export/assisted-execution-bundle-index'"),
  layerPresent: layer.includes('buildAssistedExecutionBundleIndex') && layer.includes('publishing_map') && layer.includes('publishing_payload'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
