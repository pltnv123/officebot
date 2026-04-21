const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/boundedCoordinatorExecutionBridgeLayer.js', 'utf8');
const reportPath = './docs/artifacts/bounded-coordinator-execution-bridge.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildBoundedCoordinatorExecutionBridgeLayer') && layer.includes('bounded_coordinator_execution_bridge') && layer.includes('execution_bridge_payload'),
  endpointPresent: server.includes("app.get('/api/export/bounded-coordinator-execution-bridge'") && server.includes('bounded_coordinator_execution_bridge: buildBoundedCoordinatorExecutionBridgeLayer({'),
  statePayloadPresent: server.includes('enriched.bounded_coordinator_execution_bridge = buildBoundedCoordinatorExecutionBridgeLayer({'),
  artifactPresent: Boolean(artifact),
  bridgeSurface: typeof artifact?.bounded_coordinator_execution_bridge === 'object' && artifact?.bounded_coordinator_execution_bridge?.bridge_surface_kind === 'controlled_bounded_coordinator_execution_bridge',
  bridgePlan: typeof artifact?.execution_bridge_plan === 'object' && typeof artifact?.execution_bridge_plan?.bridge_target === 'string',
  bridgeGuardrails: typeof artifact?.execution_bridge_guardrails === 'object' && artifact?.execution_bridge_guardrails?.bounded_execution_bridge_only === true,
  bridgeStages: Array.isArray(artifact?.execution_bridge_stages) && artifact?.execution_bridge_stages?.length >= 5,
  summary: typeof artifact?.execution_bridge_summary === 'object' && typeof artifact?.execution_bridge_summary?.stage_total === 'number',
  payloadPresent: typeof artifact?.execution_bridge_payload === 'object' && artifact?.execution_bridge_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
