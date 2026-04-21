const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/operatorInterventionControlLayer.js', 'utf8');
const reportPath = './docs/artifacts/operator-intervention-control.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildOperatorInterventionControlLayer') && layer.includes('operator_intervention_control') && layer.includes('intervention_payload'),
  endpointPresent: server.includes("app.get('/api/export/operator-intervention-control'") && server.includes('operator_intervention_control: buildOperatorInterventionControlLayer({'),
  statePayloadPresent: server.includes('enriched.operator_intervention_control = buildOperatorInterventionControlLayer({'),
  artifactPresent: Boolean(artifact),
  controlSurface: typeof artifact?.operator_intervention_control === 'object' && artifact?.operator_intervention_control?.intervention_surface_kind === 'controlled_operator_intervention_control',
  interventionActions: Array.isArray(artifact?.intervention_actions) && artifact?.intervention_actions?.length === 3,
  preconditions: Array.isArray(artifact?.intervention_preconditions) && artifact?.intervention_preconditions?.length === 3,
  guardrails: Array.isArray(artifact?.intervention_guardrails) && artifact?.intervention_guardrails?.length === 3,
  summary: typeof artifact?.intervention_summary === 'object' && typeof artifact?.intervention_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.intervention_payload === 'object' && artifact?.intervention_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
