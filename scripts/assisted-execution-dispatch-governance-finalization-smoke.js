const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDispatchGovernanceFinalizationLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-dispatch-governance-finalization.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionDispatchGovernanceFinalizationLayer') && layer.includes('governance_decision_outcome') && layer.includes('release_to_handoff_readiness'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-dispatch-governance-finalization'") && server.includes('assisted_execution_dispatch_governance_finalization: buildAssistedExecutionDispatchGovernanceFinalizationLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_dispatch_governance_finalization = buildAssistedExecutionDispatchGovernanceFinalizationLayer({'),
  artifactPresent: Boolean(artifact),
  governanceOutcome: typeof artifact?.governance_decision_outcome === 'object' && typeof artifact?.governance_decision_outcome?.decision_outcome === 'string',
  reviewPosture: typeof artifact?.review_posture_summary === 'object' && typeof artifact?.review_posture_summary?.activation_review_decision === 'string',
  governanceGates: Array.isArray(artifact?.governance_gates) && artifact.governance_gates.length >= 1,
  handoffReadiness: typeof artifact?.release_to_handoff_readiness === 'object' && typeof artifact?.release_to_handoff_readiness?.readiness === 'string',
  finalizationSummary: typeof artifact?.governance_finalization_summary === 'object' && typeof artifact?.governance_finalization_summary?.gate_total === 'number',
  payloadPresent: typeof artifact?.governance_finalization_payload === 'object' && artifact?.governance_finalization_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
