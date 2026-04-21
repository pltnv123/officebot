const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/executionEvidenceLedgerLayer.js', 'utf8');
const reportPath = './docs/artifacts/execution-evidence-ledger.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildExecutionEvidenceLedgerLayer') && layer.includes('execution_evidence_ledger') && layer.includes('evidence_payload'),
  endpointPresent: server.includes("app.get('/api/export/execution-evidence-ledger'") && server.includes('execution_evidence_ledger: buildExecutionEvidenceLedgerLayer({'),
  statePayloadPresent: server.includes('enriched.execution_evidence_ledger = buildExecutionEvidenceLedgerLayer({'),
  artifactPresent: Boolean(artifact),
  ledgerSurface: typeof artifact?.execution_evidence_ledger === 'object' && artifact?.execution_evidence_ledger?.evidence_surface_kind === 'controlled_execution_evidence_ledger',
  evidenceCatalog: Array.isArray(artifact?.evidence_catalog) && artifact?.evidence_catalog?.length === 3,
  laneEntries: Array.isArray(artifact?.lane_evidence_entries) && artifact?.lane_evidence_entries?.length === 3,
  guardrails: Array.isArray(artifact?.evidence_guardrails) && artifact?.evidence_guardrails?.length === 3,
  summary: typeof artifact?.evidence_summary === 'object' && typeof artifact?.evidence_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.evidence_payload === 'object' && artifact?.evidence_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
