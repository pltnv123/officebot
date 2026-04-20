const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDispatchDecisionLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-dispatch-decision.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionDispatchDecisionLayer') && layer.includes('dispatch_decision_options') && layer.includes('recommended_dispatch_decision_outcome'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-dispatch-decision'") && server.includes('assisted_execution_dispatch_decision: buildAssistedExecutionDispatchDecisionLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_dispatch_decision = buildAssistedExecutionDispatchDecisionLayer({'),
  artifactPresent: Boolean(artifact),
  decisionOptions: Array.isArray(artifact?.dispatch_decision_options) && artifact.dispatch_decision_options.length >= 1,
  approvalFraming: typeof artifact?.approval_style_decision_framing === 'object' && typeof artifact?.approval_style_decision_framing?.framing_mode === 'string',
  blockersMatrix: typeof artifact?.decision_blockers_matrix === 'object' && typeof artifact?.decision_blockers_matrix?.activation_review_holds === 'number',
  recommendedOutcome: typeof artifact?.recommended_dispatch_decision_outcome === 'object' && typeof artifact?.recommended_dispatch_decision_outcome?.outcome === 'string',
  decisionSummary: typeof artifact?.decision_summary === 'object' && typeof artifact?.decision_summary?.option_total === 'number',
  payloadPresent: typeof artifact?.decision_payload === 'object' && artifact?.decision_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
