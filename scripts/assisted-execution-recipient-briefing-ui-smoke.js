const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionRecipientBriefingLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="assisted-briefing-panel"') && html.includes('id="assisted-briefing-priorities"') && html.includes('id="assisted-briefing-payload"'),
  clientWiring: js.includes("const assistedBriefingPanelEl = document.getElementById('assisted-briefing-panel');") && js.includes('function renderAssistedBriefingPanel()') && js.includes('lastClientPayload?.assisted_execution_recipient_briefing'),
  renderFields: js.includes('curated_recipient_briefs: ${Object.keys(briefing.curated_recipient_briefs || {}).join') && js.includes('briefing_priorities: cto=') && js.includes('recipient_summary_payload: count='),
  serverWiring: server.includes('enriched.assisted_execution_recipient_briefing = buildAssistedExecutionRecipientBriefing({') && server.includes("app.get('/api/export/assisted-execution-recipient-briefing'"),
  layerPresent: layer.includes('buildAssistedExecutionRecipientBriefing') && layer.includes('curated_recipient_briefs') && layer.includes('briefing_payload'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
