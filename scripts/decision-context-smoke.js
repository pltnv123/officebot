const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/knowledgeAwareLayer.js', 'utf8');
const reportPath = './docs/artifacts/decision-context.json';

const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  decisionSurfaceExported: layer.includes('buildDecisionConsumerSurface') && layer.includes('retrieval_aware_planning_hints') && layer.includes('memory_aware_task_context'),
  decisionEndpointPresent: server.includes("app.get('/api/export/decision-context'") && server.includes('decision_context: buildDecisionConsumerSurface'),
  artifactPresent: Boolean(artifact),
  decisionSummary: typeof artifact?.decision_summary === 'object' && typeof artifact?.decision_summary?.routing_focus === 'string',
  retrievalHints: Array.isArray(artifact?.retrieval_aware_planning_hints) && artifact.retrieval_aware_planning_hints.length >= 3,
  routingContext: typeof artifact?.routing_context_summary === 'object' && typeof artifact?.routing_context_summary?.runtime_tasks === 'number',
  memoryAwareContext: Array.isArray(artifact?.memory_aware_task_context) && artifact.memory_aware_task_context.length >= 1,
  briefPresent: typeof artifact?.cto_orchestrator_brief === 'object' && typeof artifact?.cto_orchestrator_brief?.headline === 'string',
  compactPayload: typeof artifact?.compact_decision_payload === 'object' && Array.isArray(artifact?.compact_decision_payload?.hint_kinds),
};

console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
