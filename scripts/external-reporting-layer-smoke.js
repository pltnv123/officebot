const fs = require('fs');
const reportPath = './docs/artifacts/external-reporting-layer.json';
if (!fs.existsSync(reportPath)) {
  console.error(JSON.stringify({ ok: false, blocker: 'report artifact missing' }, null, 2));
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const checks = {
  runtimeSummary: typeof report.runtime_summary === 'object' && typeof report.runtime_summary.live_state === 'string',
  operatorSummary: typeof report.operator_summary === 'object' && Array.isArray(report.operator_summary.qa_view_only_actions),
  approvalsRetriesEscalations: typeof report.approvals_retries_escalations === 'object' && typeof report.approvals_retries_escalations.retry_total === 'number',
  maintenanceSummary: typeof report.maintenance_summary === 'object' && typeof report.maintenance_summary.pending_total === 'number',
  cloneRehearsalSummary: typeof report.clone_rehearsal_summary === 'object' && typeof report.clone_rehearsal_summary.scenario_outcomes === 'object',
  exportFriendly: typeof report.export_friendly === 'object' && typeof report.export_friendly.clone_rehearsal_summary === 'object',
  fiveScenarios: Object.keys(report.clone_rehearsal_summary?.scenario_outcomes || {}).length === 5,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
