const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const css = fs.readFileSync('./style.css', 'utf8');
const js = fs.readFileSync('./scripts/tasks-ui.js', 'utf8');
const server = fs.readFileSync('./backend/server.js', 'utf8');

const checks = {
  panelMount: html.includes('id="decision-panel"') && html.includes('id="decision-summary"') && html.includes('id="decision-memory"'),
  panelStyles: css.includes('.decision-panel{') && css.includes('.decision-chip{') && css.includes('.decision-memory-item{'),
  clientWiring: js.includes("const decisionPanelEl = document.getElementById('decision-panel');") && js.includes('function renderDecisionPanel()') && js.includes('lastClientPayload?.knowledge_context'),
  renderFields: js.includes('decision_summary: focus=') && js.includes('routing_context_summary: tasks=') && js.includes('retrieval_aware_planning_hints') && js.includes('memory_aware_task_context'),
  serverPayload: server.includes('enriched.knowledge_context = buildKnowledgeAwareContext({'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
