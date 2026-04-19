const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionStakeholderPackageLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-stakeholder-package.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionStakeholderPackage') && layer.includes('curated_audience_summaries') && layer.includes('stakeholder_delivery_payload'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-stakeholder-package'") && server.includes('assisted_execution_stakeholder_package: buildAssistedExecutionStakeholderPackage'),
  statePayloadPresent: server.includes('enriched.assisted_execution_stakeholder_package = buildAssistedExecutionStakeholderPackage({'),
  artifactPresent: Boolean(artifact),
  audienceSummaries: typeof artifact?.curated_audience_summaries === 'object' && typeof artifact?.curated_audience_summaries?.cto === 'object',
  deliverySlices: typeof artifact?.delivery_slices === 'object' && typeof artifact?.delivery_slices?.publishing_slice === 'object',
  recipientRouting: typeof artifact?.recipient_specific_routing === 'object' && artifact?.recipient_specific_routing?.stakeholder_route === 'assisted_execution_publishing_pack',
  stakeholderPayload: typeof artifact?.stakeholder_summary_payload === 'object' && artifact?.stakeholder_summary_payload?.consumer_ready === true,
  audiencePointers: typeof artifact?.audience_surface_pointers === 'object' && typeof artifact?.audience_surface_pointers?.stakeholder === 'object',
  deliveryPayload: typeof artifact?.stakeholder_delivery_payload === 'object' && Array.isArray(artifact?.stakeholder_delivery_payload?.audiences),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
