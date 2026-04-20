const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDispatchActivationReviewLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-dispatch-activation-review.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionDispatchActivationReviewLayer') && layer.includes('activation_review_checklist') && layer.includes('recommended_activation_review_decision'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-dispatch-activation-review'") && server.includes('assisted_execution_dispatch_activation_review: buildAssistedExecutionDispatchActivationReviewLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_dispatch_activation_review = buildAssistedExecutionDispatchActivationReviewLayer({'),
  artifactPresent: Boolean(artifact),
  reviewChecklist: Array.isArray(artifact?.activation_review_checklist) && artifact.activation_review_checklist.length >= 1,
  consensusSummary: typeof artifact?.advisory_consensus_summary === 'object' && typeof artifact?.advisory_consensus_summary?.launch_posture === 'string',
  blockersDigest: typeof artifact?.launch_blockers_digest === 'object' && typeof artifact?.launch_blockers_digest?.hold_reason_total === 'number',
  reviewDecision: typeof artifact?.recommended_activation_review_decision === 'object' && typeof artifact?.recommended_activation_review_decision?.decision === 'string',
  reviewSummary: typeof artifact?.activation_review_summary === 'object' && typeof artifact?.activation_review_summary?.checklist_total === 'number',
  payloadPresent: typeof artifact?.activation_review_payload === 'object' && artifact?.activation_review_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
