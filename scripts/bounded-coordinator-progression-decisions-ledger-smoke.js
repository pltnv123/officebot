const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/boundedCoordinatorProgressionDecisionsLedgerLayer.js', 'utf8');
const reportPath = './docs/artifacts/bounded-coordinator-progression-decisions-ledger.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildBoundedCoordinatorProgressionDecisionsLedgerLayer') && layer.includes('bounded_coordinator_progression_decisions_ledger') && layer.includes('progression_decision_payload'),
  endpointPresent: server.includes("app.get('/api/export/bounded-coordinator-progression-decisions-ledger'") && server.includes('bounded_coordinator_progression_decisions_ledger: buildBoundedCoordinatorProgressionDecisionsLedgerLayer({'),
  statePayloadPresent: server.includes('enriched.bounded_coordinator_progression_decisions_ledger = buildBoundedCoordinatorProgressionDecisionsLedgerLayer({'),
  artifactPresent: Boolean(artifact),
  ledgerSurface: typeof artifact?.bounded_coordinator_progression_decisions_ledger === 'object' && artifact?.bounded_coordinator_progression_decisions_ledger?.ledger_surface_kind === 'controlled_bounded_coordinator_progression_decisions_ledger',
  decisionRecords: Array.isArray(artifact?.progression_decision_records) && artifact?.progression_decision_records?.length >= 7,
  decisionLog: Array.isArray(artifact?.progression_decision_log) && artifact?.progression_decision_log?.length >= 7,
  guardrails: typeof artifact?.progression_decision_guardrails === 'object' && artifact?.progression_decision_guardrails?.decision_log_only === true,
  summary: typeof artifact?.progression_decision_summary === 'object' && typeof artifact?.progression_decision_summary?.record_total === 'number',
  payloadPresent: typeof artifact?.progression_decision_payload === 'object' && artifact?.progression_decision_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
