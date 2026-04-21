const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/boundedExecutionReviewHandoffLayer.js', 'utf8');
const reportPath = './docs/artifacts/bounded-execution-review-handoff.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildBoundedExecutionReviewHandoffLayer') && layer.includes('bounded_execution_review_handoff') && layer.includes('review_handoff_payload'),
  endpointPresent: server.includes("app.get('/api/export/bounded-execution-review-handoff'") && server.includes('bounded_execution_review_handoff: buildBoundedExecutionReviewHandoffLayer({'),
  statePayloadPresent: server.includes('enriched.bounded_execution_review_handoff = buildBoundedExecutionReviewHandoffLayer({'),
  artifactPresent: Boolean(artifact),
  handoffSurface: typeof artifact?.bounded_execution_review_handoff === 'object' && artifact?.bounded_execution_review_handoff?.handoff_surface_kind === 'controlled_bounded_execution_review_handoff',
  handoffInputs: typeof artifact?.review_handoff_inputs === 'object' && typeof artifact?.review_handoff_inputs?.adjudication_outcome === 'string',
  handoffCatalog: Array.isArray(artifact?.review_handoff_catalog) && artifact?.review_handoff_catalog?.length === 3,
  guardrails: typeof artifact?.review_handoff_guardrails === 'object' && artifact?.review_handoff_guardrails?.review_handoff_only === true,
  summary: typeof artifact?.review_handoff_summary === 'object' && typeof artifact?.review_handoff_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.review_handoff_payload === 'object' && artifact?.review_handoff_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
