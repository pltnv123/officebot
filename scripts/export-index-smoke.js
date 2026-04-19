const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/exportIndexLayer.js', 'utf8');
const reportPath = './docs/artifacts/export-index.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildExportIndex') && layer.includes('delivery_payload') && layer.includes('surfaces'),
  endpointPresent: server.includes("app.get('/api/export/export-index'") && server.includes('export_index: buildExportIndex'),
  statePayloadPresent: server.includes('enriched.export_index = buildExportIndex({'),
  artifactPresent: Boolean(artifact),
  surfacesPresent: typeof artifact?.surfaces === 'object' && typeof artifact?.surfaces?.stakeholder_handoff === 'object',
  endpointsPresent: Array.isArray(artifact?.endpoints) && artifact.endpoints.includes('/api/export/stakeholder-handoff'),
  artifactsPresent: Array.isArray(artifact?.artifacts) && artifact.artifacts.includes('docs/artifacts/export-index.json'),
  deliveryPayload: typeof artifact?.delivery_payload === 'object' && Array.isArray(artifact?.delivery_payload?.available_surfaces),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
