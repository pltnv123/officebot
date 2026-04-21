const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/boundedCoordinatorProgressionLayer.js', 'utf8');
const reportPath = './docs/artifacts/bounded-coordinator-progression.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildBoundedCoordinatorProgressionLayer') && layer.includes('bounded_coordinator_progression') && layer.includes('progression_payload'),
  endpointPresent: server.includes("app.get('/api/export/bounded-coordinator-progression'") && server.includes('bounded_coordinator_progression: buildBoundedCoordinatorProgressionLayer({'),
  statePayloadPresent: server.includes('enriched.bounded_coordinator_progression = buildBoundedCoordinatorProgressionLayer({'),
  artifactPresent: Boolean(artifact),
  progressionSurface: typeof artifact?.bounded_coordinator_progression === 'object' && artifact?.bounded_coordinator_progression?.progression_surface_kind === 'controlled_bounded_coordinator_progression',
  progressionInputs: typeof artifact?.progression_inputs === 'object' && Array.isArray(artifact?.progression_inputs?.lane_order),
  progressionGuardrails: typeof artifact?.progression_guardrails === 'object' && artifact?.progression_guardrails?.progression_scope_only === true,
  progressionDecisionSummary: typeof artifact?.progression_decision_summary === 'object' && typeof artifact?.progression_decision_summary?.progression_decision === 'string',
  progressionCatalog: Array.isArray(artifact?.progression_catalog) && artifact?.progression_catalog?.length >= 7,
  progressionPayload: typeof artifact?.progression_payload === 'object' && artifact?.progression_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
