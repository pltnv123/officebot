const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/executorCoordinationDecisionPolicyLayer.js', 'utf8');
const reportPath = './docs/artifacts/executor-coordination-decision-policy.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildExecutorCoordinationDecisionPolicyLayer') && layer.includes('executor_coordination_decision_policy') && layer.includes('policy_decision_payload'),
  endpointPresent: server.includes("app.get('/api/export/executor-coordination-decision-policy'") && server.includes('executor_coordination_decision_policy: buildExecutorCoordinationDecisionPolicyLayer({'),
  statePayloadPresent: server.includes('enriched.executor_coordination_decision_policy = buildExecutorCoordinationDecisionPolicyLayer({'),
  artifactPresent: Boolean(artifact),
  policySurface: typeof artifact?.executor_coordination_decision_policy === 'object' && artifact?.executor_coordination_decision_policy?.policy_surface_kind === 'controlled_executor_coordination_decision_policy',
  decisionCatalog: Array.isArray(artifact?.policy_decision_catalog) && artifact?.policy_decision_catalog?.length === 3,
  selectionInputs: Array.isArray(artifact?.policy_selection_inputs) && artifact?.policy_selection_inputs?.length === 3,
  guardrails: Array.isArray(artifact?.policy_guardrails) && artifact?.policy_guardrails?.length === 3,
  summary: typeof artifact?.policy_decision_summary === 'object' && typeof artifact?.policy_decision_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.policy_decision_payload === 'object' && artifact?.policy_decision_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
