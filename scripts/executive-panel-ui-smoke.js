const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/executiveSummaryLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="executive-panel"') && html.includes('id="executive-analytics"') && html.includes('id="executive-payload"'),
  clientWiring: js.includes("const executivePanelEl = document.getElementById('executive-panel');") && js.includes('function renderExecutivePanel()') && js.includes('lastClientPayload?.executive_summary'),
  renderFields: js.includes('analytics_summary: total=') && js.includes('reporting_export_summary: approvals=') && js.includes('decision_context_summary: owner=') && js.includes('maintenance_anomaly_digest: pending='),
  serverWiring: server.includes('enriched.executive_summary = buildExecutiveSummary({') && server.includes("app.get('/api/export/executive-summary'"),
  layerPresent: layer.includes('buildExecutiveSummary') && layer.includes('operator_workflow_status_digest'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
