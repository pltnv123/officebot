const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/realBoundedCoordinatorProgressionEngineLayer.js', 'utf8');
const reportPath = './docs/artifacts/real-bounded-coordinator-progression-engine.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildRealBoundedCoordinatorProgressionEngineLayer') && layer.includes('real_bounded_coordinator_progression_engine') && layer.includes('progression_engine_payload'),
  endpointPresent: server.includes("app.get('/api/export/real-bounded-coordinator-progression-engine'") && server.includes('real_bounded_coordinator_progression_engine: buildRealBoundedCoordinatorProgressionEngineLayer({'),
  statePayloadPresent: server.includes('enriched.real_bounded_coordinator_progression_engine = buildRealBoundedCoordinatorProgressionEngineLayer({'),
  artifactPresent: Boolean(artifact),
  engineSurface: typeof artifact?.real_bounded_coordinator_progression_engine === 'object' && artifact?.real_bounded_coordinator_progression_engine?.engine_surface_kind === 'controlled_real_bounded_coordinator_progression_engine',
  engineState: typeof artifact?.progression_engine_state === 'object' && typeof artifact?.progression_engine_state?.engine_result === 'string',
  engineCatalog: Array.isArray(artifact?.progression_engine_catalog) && artifact?.progression_engine_catalog?.length >= 7,
  engineGuardrails: typeof artifact?.progression_engine_guardrails === 'object' && artifact?.progression_engine_guardrails?.bounded_engine_only === true,
  engineSummary: typeof artifact?.progression_engine_summary === 'object' && typeof artifact?.progression_engine_summary?.engine_result === 'string',
  enginePayload: typeof artifact?.progression_engine_payload === 'object' && artifact?.progression_engine_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
