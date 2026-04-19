const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionHandoffLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-handoff.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionHandoff') && layer.includes('readiness_outputs') && layer.includes('next_action_guidance'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-handoff'") && server.includes('assisted_execution_handoff: buildAssistedExecutionHandoff'),
  statePayloadPresent: server.includes('enriched.assisted_execution_handoff = buildAssistedExecutionHandoff({'),
  artifactPresent: Boolean(artifact),
  readinessOutputs: Array.isArray(artifact?.readiness_outputs) && artifact.readiness_outputs.length >= 1,
  suggestedNextHandoff: typeof artifact?.suggested_next_handoff === 'object' && typeof artifact?.suggested_next_handoff?.owner === 'string',
  handoffSummary: typeof artifact?.execution_handoff_summary === 'object' && typeof artifact?.execution_handoff_summary?.suggested_owner === 'string',
  nextActionGuidance: typeof artifact?.next_action_guidance === 'object' && Array.isArray(artifact?.next_action_guidance?.next_actions),
  compactSurface: typeof artifact?.compact_handoff_surface === 'object' && typeof artifact?.compact_handoff_surface?.role_aware === 'object',
  snapshotSafe: artifact?.compact_handoff_surface?.snapshot_safe?.reconnect_safe === true && artifact?.compact_handoff_surface?.snapshot_safe?.backfill_safe === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
