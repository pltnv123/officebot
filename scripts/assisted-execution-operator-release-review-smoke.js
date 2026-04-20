const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionOperatorReleaseReviewLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-operator-release-review.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionOperatorReleaseReviewLayer') && layer.includes('release_gates') && layer.includes('operator_review_checkpoints') && layer.includes('operator_release_review_payload'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-operator-release-review'") && server.includes('assisted_execution_operator_release_review: buildAssistedExecutionOperatorReleaseReviewLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_operator_release_review = buildAssistedExecutionOperatorReleaseReviewLayer({'),
  artifactPresent: Boolean(artifact),
  releaseGates: Array.isArray(artifact?.release_gates) && artifact.release_gates.length >= 1,
  reviewCheckpoints: Array.isArray(artifact?.operator_review_checkpoints) && artifact.operator_review_checkpoints.length === 3,
  releasePosture: typeof artifact?.release_posture === 'object' && typeof artifact?.release_posture?.posture === 'string',
  perAgentReview: Array.isArray(artifact?.per_agent_release_review) && artifact.per_agent_release_review.length === 3,
  reviewSummary: typeof artifact?.operator_release_review_summary === 'object' && typeof artifact?.operator_release_review_summary?.gate_total === 'number',
  payloadPresent: typeof artifact?.operator_release_review_payload === 'object' && artifact?.operator_release_review_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
