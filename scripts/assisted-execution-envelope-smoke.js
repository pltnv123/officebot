const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionEnvelopeLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-envelope.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionEnvelopeLayer') && layer.includes('backend_execution_envelope') && layer.includes('execution_envelope_matrix') && layer.includes('execution_envelope_payload'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-envelope'") && server.includes('assisted_execution_envelope: buildAssistedExecutionEnvelopeLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_envelope = buildAssistedExecutionEnvelopeLayer({'),
  artifactPresent: Boolean(artifact),
  backendEnvelope: typeof artifact?.backend_execution_envelope === 'object' && artifact?.backend_execution_envelope?.agent === 'backend',
  iosEnvelope: typeof artifact?.ios_execution_envelope === 'object' && artifact?.ios_execution_envelope?.agent === 'ios',
  qaEnvelope: typeof artifact?.qa_execution_envelope === 'object' && artifact?.qa_execution_envelope?.agent === 'qa',
  envelopeMatrix: Array.isArray(artifact?.execution_envelope_matrix) && artifact.execution_envelope_matrix.length === 3,
  envelopeSummary: typeof artifact?.execution_envelope_summary === 'object' && typeof artifact?.execution_envelope_summary?.envelope_total === 'number',
  payloadPresent: typeof artifact?.execution_envelope_payload === 'object' && artifact?.execution_envelope_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
