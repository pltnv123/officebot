const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionLaneReadinessReconciliationLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-lane-readiness-reconciliation.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionLaneReadinessReconciliationLayer') && layer.includes('lane_readiness_matrix') && layer.includes('cross_lane_dependency_mismatches') && layer.includes('reconciliation_outcome'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-lane-readiness-reconciliation'") && server.includes('assisted_execution_lane_readiness_reconciliation: buildAssistedExecutionLaneReadinessReconciliationLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_lane_readiness_reconciliation = buildAssistedExecutionLaneReadinessReconciliationLayer({'),
  artifactPresent: Boolean(artifact),
  readinessMatrix: Array.isArray(artifact?.lane_readiness_matrix) && artifact.lane_readiness_matrix.length === 3,
  dependencyMismatches: Array.isArray(artifact?.cross_lane_dependency_mismatches),
  blockerReconciliation: Array.isArray(artifact?.lane_blocker_reconciliation) && artifact.lane_blocker_reconciliation.length === 3,
  reconciliationOutcome: typeof artifact?.reconciliation_outcome === 'object' && typeof artifact?.reconciliation_outcome?.outcome === 'string',
  reconciliationSummary: typeof artifact?.lane_reconciliation_summary === 'object' && typeof artifact?.lane_reconciliation_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.lane_reconciliation_payload === 'object' && artifact?.lane_reconciliation_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
