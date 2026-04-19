const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/deliveryPackLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="delivery-pack-panel"') && html.includes('id="delivery-pack-landing"') && html.includes('id="delivery-pack-payload"'),
  clientWiring: js.includes("const deliveryPackPanelEl = document.getElementById('delivery-pack-panel');") && js.includes('function renderDeliveryPackPanel()') && js.includes('lastClientPayload?.delivery_pack'),
  renderFields: js.includes('landing_report: headline=') && js.includes('distribution_manifest: endpoints=') && js.includes('human_handoff_summary: owner='),
  serverWiring: server.includes('enriched.delivery_pack = buildDeliveryPack({') && server.includes("app.get('/api/export/delivery-pack'"),
  layerPresent: layer.includes('buildDeliveryPack') && layer.includes('machine_readable_manifest'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
