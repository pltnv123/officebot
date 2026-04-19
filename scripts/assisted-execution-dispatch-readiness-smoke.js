const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDispatchReadinessLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-dispatch-readiness.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionDispatchReadinessLayer') && layer.includes('assignment_readiness_checks') && layer.includes('dispatch_go_no_go_summary'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-dispatch-readiness'") && server.includes('assisted_execution_dispatch_readiness: buildAssistedExecutionDispatchReadinessLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_dispatch_readiness = buildAssistedExecutionDispatchReadinessLayer({'),
  artifactPresent: Boolean(artifact),
  readinessChecks: Array.isArray(artifact?.assignment_readiness_checks) && artifact.assignment_readiness_checks.length >= 1,
  saturationSignals: Array.isArray(artifact?.lane_saturation_signals) && artifact.lane_saturation_signals.length >= 1,
  handoffBlockers: Array.isArray(artifact?.handoff_blockers),
  goNoGo: typeof artifact?.dispatch_go_no_go_summary === 'object' && typeof artifact?.dispatch_go_no_go_summary?.status === 'string',
  payloadPresent: typeof artifact?.readiness_payload === 'object' && artifact?.readiness_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
