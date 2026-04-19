const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/stakeholderHandoffLayer.js', 'utf8');
const reportPath = './docs/artifacts/stakeholder-handoff-bundle.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildStakeholderHandoffBundle') && layer.includes('handoff_payload') && layer.includes('clone_rehearsal_status'),
  endpointPresent: server.includes("app.get('/api/export/stakeholder-handoff'") && server.includes('stakeholder_handoff: buildStakeholderHandoffBundle'),
  statePayloadPresent: server.includes('enriched.stakeholder_handoff = buildStakeholderHandoffBundle({'),
  artifactPresent: Boolean(artifact),
  executiveSummary: typeof artifact?.executive_summary === 'object' && typeof artifact?.executive_summary?.summary_kind === 'string',
  decisionSummary: typeof artifact?.decision_context_summary === 'object' && typeof artifact?.decision_context_summary?.suggested_owner === 'string',
  reportingSummary: typeof artifact?.reporting_export_summary === 'object' && typeof artifact?.reporting_export_summary?.analytics_summary === 'object',
  workflowSummary: typeof artifact?.operator_workflow_summary === 'object' && typeof artifact?.operator_workflow_summary?.card_count === 'number',
  maintenanceDigest: typeof artifact?.maintenance_anomaly_digest === 'object' && Array.isArray(artifact?.maintenance_anomaly_digest?.anomaly_flags),
  cloneStatus: typeof artifact?.clone_rehearsal_status === 'object' && typeof artifact?.clone_rehearsal_status?.export_ready === 'boolean',
  handoffPayload: typeof artifact?.handoff_payload === 'object' && Array.isArray(artifact?.handoff_payload?.top_recommendations),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
