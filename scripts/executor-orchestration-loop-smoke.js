const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/executorOrchestrationLoopLayer.js', 'utf8');
const reportPath = './docs/artifacts/executor-orchestration-loop.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildExecutorOrchestrationLoopLayer') && layer.includes('executor_orchestration_loop') && layer.includes('orchestration_loop_payload'),
  endpointPresent: server.includes("app.get('/api/export/executor-orchestration-loop'") && server.includes('executor_orchestration_loop: buildExecutorOrchestrationLoopLayer({'),
  statePayloadPresent: server.includes('enriched.executor_orchestration_loop = buildExecutorOrchestrationLoopLayer({'),
  artifactPresent: Boolean(artifact),
  loopRuntime: typeof artifact?.executor_orchestration_loop === 'object' && artifact?.executor_orchestration_loop?.loop_kind === 'governed_executor_orchestration_loop',
  loopState: typeof artifact?.orchestration_loop_state === 'object' && typeof artifact?.orchestration_loop_state?.loop_mode === 'string',
  laneOrder: Array.isArray(artifact?.lane_execution_order) && artifact?.lane_execution_order?.length === 3,
  crossLaneGates: Array.isArray(artifact?.cross_lane_execution_gates) && artifact?.cross_lane_execution_gates?.length > 0,
  loopSummary: typeof artifact?.orchestration_loop_summary === 'object' && typeof artifact?.orchestration_loop_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.orchestration_loop_payload === 'object' && artifact?.orchestration_loop_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
