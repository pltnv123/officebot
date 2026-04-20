const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/backendExecutorRuntimeLayer.js', 'utf8');
const reportPath = './docs/artifacts/backend-executor-runtime.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildBackendExecutorRuntimeLayer') && layer.includes('backend_executor_runtime') && layer.includes('backend_runtime_payload'),
  endpointPresent: server.includes("app.get('/api/export/backend-executor-runtime'") && server.includes('backend_executor_runtime: buildBackendExecutorRuntimeLayer'),
  statePayloadPresent: server.includes('enriched.backend_executor_runtime = buildBackendExecutorRuntimeLayer({'),
  artifactPresent: Boolean(artifact),
  executorRuntime: typeof artifact?.backend_executor_runtime === 'object' && artifact?.backend_executor_runtime?.lane === 'backend',
  executionPlan: typeof artifact?.backend_execution_plan === 'object' && Array.isArray(artifact?.backend_execution_plan?.staged_steps),
  executionConstraints: typeof artifact?.backend_execution_constraints === 'object' && artifact?.backend_execution_constraints?.runtime_source_of_truth === 'supabase',
  executionHooks: typeof artifact?.backend_execution_hooks === 'object' && typeof artifact?.backend_execution_hooks?.stage_backend_execution === 'object',
  runtimeSummary: typeof artifact?.backend_runtime_summary === 'object' && typeof artifact?.backend_runtime_summary?.authorized === 'boolean',
  payloadPresent: typeof artifact?.backend_runtime_payload === 'object' && artifact?.backend_runtime_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
