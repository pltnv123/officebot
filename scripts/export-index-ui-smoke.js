const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/exportIndexLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="export-index-panel"') && html.includes('id="export-index-surfaces"') && html.includes('id="export-index-payload"'),
  clientWiring: js.includes("const exportIndexPanelEl = document.getElementById('export-index-panel');") && js.includes('function renderExportIndexPanel()') && js.includes('lastClientPayload?.export_index'),
  renderFields: js.includes('surfaces: ${Object.keys(index.surfaces || {}).join') && js.includes('endpoints: ${(index.endpoints || []).join') && js.includes('artifacts: ${(index.artifacts || []).join'),
  serverWiring: server.includes('enriched.export_index = buildExportIndex({') && server.includes("app.get('/api/export/export-index'"),
  layerPresent: layer.includes('buildExportIndex') && layer.includes('delivery_payload'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
