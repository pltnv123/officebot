const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/executorCoordinationActionsLayer.js', 'utf8');
const reportPath = './docs/artifacts/executor-coordination-actions.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildExecutorCoordinationActionsLayer') && layer.includes('executor_coordination_actions') && layer.includes('coordination_actions_payload'),
  endpointPresent: server.includes("app.get('/api/export/executor-coordination-actions'") && server.includes('executor_coordination_actions: buildExecutorCoordinationActionsLayer({'),
  statePayloadPresent: server.includes('enriched.executor_coordination_actions = buildExecutorCoordinationActionsLayer({'),
  artifactPresent: Boolean(artifact),
  actionsSurface: typeof artifact?.executor_coordination_actions === 'object' && artifact?.executor_coordination_actions?.action_surface_kind === 'controlled_executor_coordination_actions',
  laneCatalog: Array.isArray(artifact?.lane_action_catalog) && artifact?.lane_action_catalog?.length === 3,
  preconditions: Array.isArray(artifact?.action_preconditions) && artifact?.action_preconditions?.length === 3,
  guardrails: Array.isArray(artifact?.action_guardrails) && artifact?.action_guardrails?.length === 3,
  summary: typeof artifact?.coordination_actions_summary === 'object' && typeof artifact?.coordination_actions_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.coordination_actions_payload === 'object' && artifact?.coordination_actions_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
