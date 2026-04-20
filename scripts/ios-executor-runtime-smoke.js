const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/iosExecutorRuntimeLayer.js', 'utf8');
const reportPath = './docs/artifacts/ios-executor-runtime.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildIosExecutorRuntimeLayer') && layer.includes('ios_executor_runtime') && layer.includes('ios_runtime_payload'),
  endpointPresent: server.includes("app.get('/api/export/ios-executor-runtime'") && server.includes('ios_executor_runtime: buildIosExecutorRuntimeLayer({'),
  statePayloadPresent: server.includes('enriched.ios_executor_runtime = buildIosExecutorRuntimeLayer({'),
  artifactPresent: Boolean(artifact),
  executorRuntime: typeof artifact?.ios_executor_runtime === 'object' && artifact?.ios_executor_runtime?.lane === 'ios',
  executionPlan: typeof artifact?.ios_execution_plan === 'object' && Array.isArray(artifact?.ios_execution_plan?.staged_steps),
  executionConstraints: typeof artifact?.ios_execution_constraints === 'object' && artifact?.ios_execution_constraints?.runtime_source_of_truth === 'supabase',
  executionHooks: typeof artifact?.ios_execution_hooks === 'object' && typeof artifact?.ios_execution_hooks?.stage_ios_execution === 'object',
  runtimeSummary: typeof artifact?.ios_runtime_summary === 'object' && typeof artifact?.ios_runtime_summary?.authorized === 'boolean',
  payloadPresent: typeof artifact?.ios_runtime_payload === 'object' && artifact?.ios_runtime_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
