const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/backendBoundedExecutionHooksLayer.js', 'utf8');
const reportPath = './docs/artifacts/backend-bounded-execution-hooks.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildBackendBoundedExecutionHooksLayer') && layer.includes('backend_bounded_execution_hooks') && layer.includes('bounded_backend_hook_payload'),
  endpointPresent: server.includes("app.get('/api/export/backend-bounded-execution-hooks'") && server.includes('backend_bounded_execution_hooks: buildBackendBoundedExecutionHooksLayer({'),
  statePayloadPresent: server.includes('enriched.backend_bounded_execution_hooks = buildBackendBoundedExecutionHooksLayer({'),
  artifactPresent: Boolean(artifact),
  hookSurface: typeof artifact?.backend_bounded_execution_hooks === 'object' && artifact?.backend_bounded_execution_hooks?.hook_surface_kind === 'controlled_backend_bounded_execution_hooks',
  hookCatalog: typeof artifact?.bounded_backend_hook_catalog === 'object' && Array.isArray(artifact?.bounded_backend_hook_catalog?.hooks),
  hookGuardrails: typeof artifact?.bounded_backend_hook_guardrails === 'object' && artifact?.bounded_backend_hook_guardrails?.bounded_backend_hooks_only === true,
  summary: typeof artifact?.bounded_backend_hook_summary === 'object' && typeof artifact?.bounded_backend_hook_summary?.hook_total === 'number',
  payloadPresent: typeof artifact?.bounded_backend_hook_payload === 'object' && artifact?.bounded_backend_hook_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
