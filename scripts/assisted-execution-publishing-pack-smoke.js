const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionPublishingPackLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-publishing-pack.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionPublishingPack') && layer.includes('consumer_handoff_manifest') && layer.includes('distribution_priorities'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-publishing-pack'") && server.includes('assisted_execution_publishing_pack: buildAssistedExecutionPublishingPack'),
  statePayloadPresent: server.includes('enriched.assisted_execution_publishing_pack = buildAssistedExecutionPublishingPack({'),
  artifactPresent: Boolean(artifact),
  manifestPresent: typeof artifact?.consumer_handoff_manifest === 'object' && artifact?.consumer_handoff_manifest?.pack_ready === true,
  prioritiesPresent: typeof artifact?.distribution_priorities === 'object' && Array.isArray(artifact?.distribution_priorities?.routing_recommendations),
  curatedRouting: typeof artifact?.curated_entry_routing === 'object' && artifact?.curated_entry_routing?.recommended_entry === 'assisted_execution_delivery',
  pointersPresent: typeof artifact?.surface_pointers === 'object' && typeof artifact?.surface_pointers?.index === 'object',
  ctoSummary: typeof artifact?.cto_orchestrator_consumption_summary === 'object' && typeof artifact?.cto_orchestrator_consumption_summary?.recommended_entry === 'string',
  publishingPayload: typeof artifact?.publishing_payload === 'object' && Array.isArray(artifact?.publishing_payload?.distribution_map),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
