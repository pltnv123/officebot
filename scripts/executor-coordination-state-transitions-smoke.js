const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/executorCoordinationStateTransitionsLayer.js', 'utf8');
const reportPath = './docs/artifacts/executor-coordination-state-transitions.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildExecutorCoordinationStateTransitionsLayer') && layer.includes('executor_coordination_state_transitions') && layer.includes('state_progression_payload'),
  endpointPresent: server.includes("app.get('/api/export/executor-coordination-state-transitions'") && server.includes('executor_coordination_state_transitions: buildExecutorCoordinationStateTransitionsLayer({'),
  statePayloadPresent: server.includes('enriched.executor_coordination_state_transitions = buildExecutorCoordinationStateTransitionsLayer({'),
  artifactPresent: Boolean(artifact),
  transitionSurface: typeof artifact?.executor_coordination_state_transitions === 'object' && artifact?.executor_coordination_state_transitions?.transition_surface_kind === 'controlled_executor_coordination_state_transitions',
  transitionCatalog: Array.isArray(artifact?.transition_catalog) && artifact?.transition_catalog?.length === 3,
  preconditions: Array.isArray(artifact?.transition_preconditions) && artifact?.transition_preconditions?.length === 3,
  guardrails: Array.isArray(artifact?.transition_guardrails) && artifact?.transition_guardrails?.length === 3,
  summary: typeof artifact?.state_progression_summary === 'object' && typeof artifact?.state_progression_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.state_progression_payload === 'object' && artifact?.state_progression_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
