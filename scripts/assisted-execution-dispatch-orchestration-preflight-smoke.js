const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDispatchOrchestrationPreflightLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-dispatch-orchestration-preflight.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionDispatchOrchestrationPreflightLayer') && layer.includes('preflight_checks') && layer.includes('dispatch_start_recommendation'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-dispatch-orchestration-preflight'") && server.includes('assisted_execution_dispatch_orchestration_preflight: buildAssistedExecutionDispatchOrchestrationPreflightLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_dispatch_orchestration_preflight = buildAssistedExecutionDispatchOrchestrationPreflightLayer({'),
  artifactPresent: Boolean(artifact),
  preflightChecks: Array.isArray(artifact?.preflight_checks) && artifact.preflight_checks.length >= 1,
  riskFlags: Array.isArray(artifact?.orchestration_risk_flags),
  dependencyMatrix: Array.isArray(artifact?.dependency_readiness_matrix) && artifact.dependency_readiness_matrix.length >= 1,
  startRecommendation: typeof artifact?.dispatch_start_recommendation === 'object' && typeof artifact?.dispatch_start_recommendation?.status === 'string',
  preflightSummary: typeof artifact?.preflight_summary === 'object' && typeof artifact?.preflight_summary?.total_checks === 'number',
  payloadPresent: typeof artifact?.preflight_payload === 'object' && artifact?.preflight_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
