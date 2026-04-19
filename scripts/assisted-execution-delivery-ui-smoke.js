const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDeliveryLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="assisted-delivery-panel"') && html.includes('id="assisted-delivery-cto"') && html.includes('id="assisted-delivery-payload"'),
  clientWiring: js.includes("const assistedDeliveryPanelEl = document.getElementById('assisted-delivery-panel');") && js.includes('function renderAssistedDeliveryPanel()') && js.includes('lastClientPayload?.assisted_execution_delivery'),
  renderFields: js.includes('readiness_outputs: ${(bundle.readiness_outputs || []).length}') && js.includes('suggested_next_handoff: owner=') && js.includes('cto_orchestrator_handoff_summary: owner='),
  serverWiring: server.includes('enriched.assisted_execution_delivery = buildAssistedExecutionDeliveryBundle({') && server.includes("app.get('/api/export/assisted-execution-delivery'"),
  layerPresent: layer.includes('buildAssistedExecutionDeliveryBundle') && layer.includes('cto_orchestrator_handoff_summary') && layer.includes('delivery_payload'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
