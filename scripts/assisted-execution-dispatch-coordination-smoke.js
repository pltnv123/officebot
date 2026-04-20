const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDispatchCoordinationLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-dispatch-coordination.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionDispatchCoordinationLayer') && layer.includes('cross_lane_coordination_summary') && layer.includes('coordinated_dispatch_plan'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-dispatch-coordination'") && server.includes('assisted_execution_dispatch_coordination: buildAssistedExecutionDispatchCoordinationLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_dispatch_coordination = buildAssistedExecutionDispatchCoordinationLayer({'),
  artifactPresent: Boolean(artifact),
  coordinationSummary: typeof artifact?.cross_lane_coordination_summary === 'object' && typeof artifact?.cross_lane_coordination_summary?.go_no_go === 'string',
  dispatchDependencies: Array.isArray(artifact?.dispatch_dependencies) && artifact.dispatch_dependencies.length >= 1,
  coordinationBlockers: Array.isArray(artifact?.coordination_blockers),
  coordinatedPlan: Array.isArray(artifact?.coordinated_dispatch_plan) && artifact.coordinated_dispatch_plan.length >= 1,
  payloadPresent: typeof artifact?.coordination_payload === 'object' && artifact?.coordination_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
