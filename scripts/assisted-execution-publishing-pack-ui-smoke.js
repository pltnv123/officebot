const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionPublishingPackLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="assisted-pack-panel"') && html.includes('id="assisted-pack-routing"') && html.includes('id="assisted-pack-payload"'),
  clientWiring: js.includes("const assistedPackPanelEl = document.getElementById('assisted-pack-panel');") && js.includes('function renderAssistedPackPanel()') && js.includes('lastClientPayload?.assisted_execution_publishing_pack'),
  renderFields: js.includes('consumer_handoff_manifest: owner=') && js.includes('distribution_priorities: cto=') && js.includes('curated_entry_routing: recommended='),
  serverWiring: server.includes('enriched.assisted_execution_publishing_pack = buildAssistedExecutionPublishingPack({') && server.includes("app.get('/api/export/assisted-execution-publishing-pack'"),
  layerPresent: layer.includes('buildAssistedExecutionPublishingPack') && layer.includes('consumer_handoff_manifest') && layer.includes('publishing_payload'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
