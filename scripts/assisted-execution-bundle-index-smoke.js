const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionBundleIndexLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-bundle-index.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionBundleIndex') && layer.includes('publishing_map') && layer.includes('publishing_payload'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-bundle-index'") && server.includes('assisted_execution_bundle_index: buildAssistedExecutionBundleIndex'),
  statePayloadPresent: server.includes('enriched.assisted_execution_bundle_index = buildAssistedExecutionBundleIndex({'),
  artifactPresent: Boolean(artifact),
  surfacesPresent: typeof artifact?.surfaces === 'object' && typeof artifact?.surfaces?.assisted_execution_delivery === 'object',
  publishingMap: typeof artifact?.publishing_map === 'object' && artifact?.publishing_map?.recommended_entry === 'assisted_execution_delivery',
  endpointsPresent: Array.isArray(artifact?.endpoints) && artifact.endpoints.includes('/api/export/assisted-execution-bundle-index'),
  artifactsPresent: Array.isArray(artifact?.artifacts) && artifact.artifacts.includes('docs/artifacts/assisted-execution-delivery.json'),
  publishingPayload: typeof artifact?.publishing_payload === 'object' && Array.isArray(artifact?.publishing_payload?.distribution_map),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
