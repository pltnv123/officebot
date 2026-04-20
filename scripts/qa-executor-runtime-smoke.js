const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/qaExecutorRuntimeLayer.js', 'utf8');
const reportPath = './docs/artifacts/qa-executor-runtime.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildQaExecutorRuntimeLayer') && layer.includes('qa_executor_runtime') && layer.includes('qa_runtime_payload'),
  endpointPresent: server.includes("app.get('/api/export/qa-executor-runtime'") && server.includes('qa_executor_runtime: buildQaExecutorRuntimeLayer('),
  statePayloadPresent: server.includes('enriched.qa_executor_runtime = buildQaExecutorRuntimeLayer({'),
  artifactPresent: Boolean(artifact),
  executorRuntime: typeof artifact?.qa_executor_runtime === 'object' && artifact?.qa_executor_runtime?.lane === 'qa',
  executionPlan: typeof artifact?.qa_execution_plan === 'object' && Array.isArray(artifact?.qa_execution_plan?.staged_steps),
  executionConstraints: typeof artifact?.qa_execution_constraints === 'object' && artifact?.qa_execution_constraints?.runtime_source_of_truth === 'supabase',
  executionHooks: typeof artifact?.qa_execution_hooks === 'object' && typeof artifact?.qa_execution_hooks?.stage_qa_execution === 'object',
  runtimeSummary: typeof artifact?.qa_runtime_summary === 'object' && typeof artifact?.qa_runtime_summary?.authorized === 'boolean',
  payloadPresent: typeof artifact?.qa_runtime_payload === 'object' && artifact?.qa_runtime_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
