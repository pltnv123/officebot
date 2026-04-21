const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/qaBoundedVerificationHooksLayer.js', 'utf8');
const reportPath = './docs/artifacts/qa-bounded-verification-hooks.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildQaBoundedVerificationHooksLayer') && layer.includes('qa_bounded_verification_hooks') && layer.includes('bounded_qa_hook_payload'),
  endpointPresent: server.includes("app.get('/api/export/qa-bounded-verification-hooks'") && server.includes('qa_bounded_verification_hooks: buildQaBoundedVerificationHooksLayer({'),
  statePayloadPresent: server.includes('enriched.qa_bounded_verification_hooks = buildQaBoundedVerificationHooksLayer({'),
  artifactPresent: Boolean(artifact),
  hookSurface: typeof artifact?.qa_bounded_verification_hooks === 'object' && artifact?.qa_bounded_verification_hooks?.hook_surface_kind === 'controlled_qa_bounded_verification_hooks',
  hookCatalog: typeof artifact?.bounded_qa_hook_catalog === 'object' && Array.isArray(artifact?.bounded_qa_hook_catalog?.hooks),
  hookGuardrails: typeof artifact?.bounded_qa_hook_guardrails === 'object' && artifact?.bounded_qa_hook_guardrails?.bounded_qa_hooks_only === true,
  summary: typeof artifact?.bounded_qa_hook_summary === 'object' && typeof artifact?.bounded_qa_hook_summary?.hook_total === 'number',
  payloadPresent: typeof artifact?.bounded_qa_hook_payload === 'object' && artifact?.bounded_qa_hook_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
