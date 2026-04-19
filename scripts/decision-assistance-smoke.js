const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/decisionAssistanceLayer.js', 'utf8');
const reportPath = './docs/artifacts/decision-assistance.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildDecisionAssistanceSurface') && layer.includes('routing_recommendations') && layer.includes('compact_assistance_surface'),
  endpointPresent: server.includes("app.get('/api/export/decision-assistance'") && server.includes('decision_assistance: buildDecisionAssistanceSurface'),
  statePayloadPresent: server.includes('enriched.decision_assistance = buildDecisionAssistanceSurface({'),
  artifactPresent: Boolean(artifact),
  routingRecommendations: Array.isArray(artifact?.routing_recommendations) && artifact.routing_recommendations.length >= 1,
  operatorHints: typeof artifact?.operator_decision_hints === 'object' && Array.isArray(artifact?.operator_decision_hints?.top_recommendations),
  planningOutput: typeof artifact?.planning_output === 'object' && typeof artifact?.planning_output?.suggested_owner === 'string',
  compactSurface: typeof artifact?.compact_assistance_surface === 'object' && typeof artifact?.compact_assistance_surface?.analytics_alignment === 'object',
  snapshotSafe: artifact?.compact_assistance_surface?.snapshot_safe?.reconnect_safe === true && artifact?.compact_assistance_surface?.snapshot_safe?.backfill_safe === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
