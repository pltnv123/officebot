const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionStakeholderPackageLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="assisted-stakeholder-panel"') && html.includes('id="assisted-stakeholder-routing"') && html.includes('id="assisted-stakeholder-payload"'),
  clientWiring: js.includes("const assistedStakeholderPanelEl = document.getElementById('assisted-stakeholder-panel');") && js.includes('function renderAssistedStakeholderPanel()') && js.includes('lastClientPayload?.assisted_execution_stakeholder_package'),
  renderFields: js.includes('curated_audience_summaries: ${Object.keys(pkg.curated_audience_summaries || {}).join') && js.includes('recipient_specific_routing: cto=') && js.includes('stakeholder_summary_payload: entry='),
  serverWiring: server.includes('enriched.assisted_execution_stakeholder_package = buildAssistedExecutionStakeholderPackage({') && server.includes("app.get('/api/export/assisted-execution-stakeholder-package'"),
  layerPresent: layer.includes('buildAssistedExecutionStakeholderPackage') && layer.includes('curated_audience_summaries') && layer.includes('stakeholder_delivery_payload'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
