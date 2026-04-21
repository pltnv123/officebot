const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/laneResultAdjudicationLayer.js', 'utf8');
const reportPath = './docs/artifacts/lane-result-adjudication.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildLaneResultAdjudicationLayer') && layer.includes('lane_result_adjudication') && layer.includes('adjudication_payload'),
  endpointPresent: server.includes("app.get('/api/export/lane-result-adjudication'") && server.includes('lane_result_adjudication: buildLaneResultAdjudicationLayer({'),
  statePayloadPresent: server.includes('enriched.lane_result_adjudication = buildLaneResultAdjudicationLayer({'),
  artifactPresent: Boolean(artifact),
  adjudicationSurface: typeof artifact?.lane_result_adjudication === 'object' && artifact?.lane_result_adjudication?.adjudication_surface_kind === 'controlled_lane_result_adjudication',
  adjudicationInputs: Array.isArray(artifact?.adjudication_inputs) && artifact?.adjudication_inputs?.length === 3,
  adjudicationOutcome: typeof artifact?.adjudication_outcome === 'object' && typeof artifact?.adjudication_outcome?.overall_outcome === 'string',
  guardrails: Array.isArray(artifact?.adjudication_guardrails) && artifact?.adjudication_guardrails?.length === 3,
  summary: typeof artifact?.adjudication_summary === 'object' && typeof artifact?.adjudication_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.adjudication_payload === 'object' && artifact?.adjudication_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
