const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/executorCoordinationExecutionGateLayer.js', 'utf8');
const reportPath = './docs/artifacts/executor-coordination-execution-gate.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildExecutorCoordinationExecutionGateLayer') && layer.includes('executor_coordination_execution_gate') && layer.includes('execution_gate_payload'),
  endpointPresent: server.includes("app.get('/api/export/executor-coordination-execution-gate'") && server.includes('executor_coordination_execution_gate: buildExecutorCoordinationExecutionGateLayer({'),
  statePayloadPresent: server.includes('enriched.executor_coordination_execution_gate = buildExecutorCoordinationExecutionGateLayer({'),
  artifactPresent: Boolean(artifact),
  gateSurface: typeof artifact?.executor_coordination_execution_gate === 'object' && artifact?.executor_coordination_execution_gate?.gate_surface_kind === 'controlled_executor_coordination_execution_gate',
  gateOutcome: Array.isArray(artifact?.execution_gate_outcome) && artifact?.execution_gate_outcome?.length === 3,
  preconditions: Array.isArray(artifact?.execution_gate_preconditions) && artifact?.execution_gate_preconditions?.length === 3,
  guardrails: Array.isArray(artifact?.execution_gate_guardrails) && artifact?.execution_gate_guardrails?.length === 3,
  summary: typeof artifact?.execution_gate_summary === 'object' && typeof artifact?.execution_gate_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.execution_gate_payload === 'object' && artifact?.execution_gate_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
