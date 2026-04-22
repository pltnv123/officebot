const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/operatorProgressionReviewLayer.js', 'utf8');
const reportPath = './docs/artifacts/operator-progression-review.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildOperatorProgressionReviewLayer') && layer.includes('operator_progression_review') && layer.includes('progression_review_payload'),
  endpointPresent: server.includes("app.get('/api/export/operator-progression-review'") && server.includes('operator_progression_review: buildOperatorProgressionReviewLayer({'),
  statePayloadPresent: server.includes('enriched.operator_progression_review = buildOperatorProgressionReviewLayer({'),
  artifactPresent: Boolean(artifact),
  reviewSurface: typeof artifact?.operator_progression_review === 'object' && artifact?.operator_progression_review?.review_surface_kind === 'controlled_operator_progression_review',
  reviewInputs: typeof artifact?.progression_review_inputs === 'object' && typeof artifact?.progression_review_inputs?.progression_candidate === 'string',
  reviewActions: Array.isArray(artifact?.progression_review_actions) && artifact?.progression_review_actions?.length >= 7,
  reviewGuardrails: typeof artifact?.progression_review_guardrails === 'object' && artifact?.progression_review_guardrails?.operator_review_surface_only === true,
  reviewSummary: typeof artifact?.progression_review_summary === 'object' && typeof artifact?.progression_review_summary?.action_total === 'number',
  reviewPayload: typeof artifact?.progression_review_payload === 'object' && artifact?.progression_review_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
