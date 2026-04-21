const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/iosBoundedExecutionHooksLayer.js', 'utf8');
const reportPath = './docs/artifacts/ios-bounded-execution-hooks.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildIosBoundedExecutionHooksLayer') && layer.includes('ios_bounded_execution_hooks') && layer.includes('bounded_ios_hook_payload'),
  endpointPresent: server.includes("app.get('/api/export/ios-bounded-execution-hooks'") && server.includes('ios_bounded_execution_hooks: buildIosBoundedExecutionHooksLayer({'),
  statePayloadPresent: server.includes('enriched.ios_bounded_execution_hooks = buildIosBoundedExecutionHooksLayer({'),
  artifactPresent: Boolean(artifact),
  hookSurface: typeof artifact?.ios_bounded_execution_hooks === 'object' && artifact?.ios_bounded_execution_hooks?.hook_surface_kind === 'controlled_ios_bounded_execution_hooks',
  hookCatalog: typeof artifact?.bounded_ios_hook_catalog === 'object' && Array.isArray(artifact?.bounded_ios_hook_catalog?.hooks),
  hookGuardrails: typeof artifact?.bounded_ios_hook_guardrails === 'object' && artifact?.bounded_ios_hook_guardrails?.bounded_ios_hooks_only === true,
  summary: typeof artifact?.bounded_ios_hook_summary === 'object' && typeof artifact?.bounded_ios_hook_summary?.hook_total === 'number',
  payloadPresent: typeof artifact?.bounded_ios_hook_payload === 'object' && artifact?.bounded_ios_hook_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
