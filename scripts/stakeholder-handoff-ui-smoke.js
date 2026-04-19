const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/stakeholderHandoffLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="handoff-panel"') && html.includes('id="handoff-executive"') && html.includes('id="handoff-payload"'),
  clientWiring: js.includes("const handoffPanelEl = document.getElementById('handoff-panel');") && js.includes('function renderHandoffPanel()') && js.includes('lastClientPayload?.stakeholder_handoff'),
  renderFields: js.includes('executive_summary: total=') && js.includes('decision_context_summary: focus=') && js.includes('clone_rehearsal_status: tasks='),
  serverWiring: server.includes('enriched.stakeholder_handoff = buildStakeholderHandoffBundle({') && server.includes("app.get('/api/export/stakeholder-handoff'"),
  layerPresent: layer.includes('buildStakeholderHandoffBundle') && layer.includes('handoff_payload'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
