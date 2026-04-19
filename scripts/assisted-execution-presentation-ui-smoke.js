const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionPresentationLayer.js', 'utf8');

const checks = {
  uiMount: html.includes('id="assisted-presentation-panel"') && html.includes('id="assisted-presentation-readiness"') && html.includes('id="assisted-presentation-payload"'),
  clientWiring: js.includes("const assistedPresentationPanelEl = document.getElementById('assisted-presentation-panel');") && js.includes('function renderAssistedPresentationPanel()') && js.includes('lastClientPayload?.assisted_execution_presentation'),
  renderFields: js.includes('readiness_outputs: ${(presentation.readiness_outputs || []).length}') && js.includes('suggested_next_handoff: owner=') && js.includes('execution_handoff_summary: owner='),
  serverWiring: server.includes('enriched.assisted_execution_presentation = buildAssistedExecutionPresentation({') && server.includes("app.get('/api/export/assisted-execution-presentation'"),
  layerPresent: layer.includes('buildAssistedExecutionPresentation') && layer.includes('presentation_payload'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
