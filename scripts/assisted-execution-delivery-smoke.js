const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDeliveryLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-delivery.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionDeliveryBundle') && layer.includes('delivery_payload') && layer.includes('cto_orchestrator_handoff_summary'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-delivery'") && server.includes('assisted_execution_delivery: buildAssistedExecutionDeliveryBundle'),
  statePayloadPresent: server.includes('enriched.assisted_execution_delivery = buildAssistedExecutionDeliveryBundle({'),
  artifactPresent: Boolean(artifact),
  readinessOutputs: Array.isArray(artifact?.readiness_outputs) && artifact.readiness_outputs.length >= 1,
  suggestedNextHandoff: typeof artifact?.suggested_next_handoff === 'object' && typeof artifact?.suggested_next_handoff?.owner === 'string',
  handoffSummary: typeof artifact?.execution_handoff_summary === 'object' && typeof artifact?.execution_handoff_summary?.suggested_owner === 'string',
  nextActionGuidance: typeof artifact?.next_action_guidance === 'object' && Array.isArray(artifact?.next_action_guidance?.next_actions),
  compactSurface: typeof artifact?.compact_handoff_surface === 'object' && typeof artifact?.compact_handoff_surface?.role_aware === 'object',
  presentationPayload: typeof artifact?.presentation_payload === 'object' && Array.isArray(artifact?.presentation_payload?.top_guidance),
  ctoSummary: typeof artifact?.cto_orchestrator_handoff_summary === 'object' && typeof artifact?.cto_orchestrator_handoff_summary?.suggested_owner === 'string',
  deliveryPayload: typeof artifact?.delivery_payload === 'object' && artifact?.delivery_payload?.presentation_ready === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
