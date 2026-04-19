const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/executiveSummaryLayer.js', 'utf8');
const reportPath = './docs/artifacts/executive-summary.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildExecutiveSummary') && layer.includes('analytics_summary') && layer.includes('executive_payload'),
  endpointPresent: server.includes("app.get('/api/export/executive-summary'") && server.includes('executive_summary: buildExecutiveSummary'),
  statePayloadPresent: server.includes('enriched.executive_summary = buildExecutiveSummary({'),
  artifactPresent: Boolean(artifact),
  analyticsSummary: typeof artifact?.analytics_summary === 'object' && typeof artifact?.analytics_summary?.total_tasks === 'number',
  reportingSummary: typeof artifact?.reporting_export_summary === 'object' && typeof artifact?.reporting_export_summary?.approvals === 'number',
  decisionSummary: typeof artifact?.decision_context_summary === 'object' && typeof artifact?.decision_context_summary?.suggested_owner === 'string',
  maintenanceDigest: typeof artifact?.maintenance_anomaly_digest === 'object' && Array.isArray(artifact?.maintenance_anomaly_digest?.anomaly_flags),
  workflowDigest: typeof artifact?.operator_workflow_status_digest === 'object' && Array.isArray(artifact?.operator_workflow_status_digest?.top_recommendations),
  executivePayload: typeof artifact?.executive_payload === 'object' && Array.isArray(artifact?.executive_payload?.anomaly_flags),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
