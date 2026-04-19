const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/deliveryPackLayer.js', 'utf8');
const reportPath = './docs/artifacts/delivery-pack.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildDeliveryPack') && layer.includes('landing_report') && layer.includes('machine_readable_manifest'),
  endpointPresent: server.includes("app.get('/api/export/delivery-pack'") && server.includes('delivery_pack: buildDeliveryPack'),
  statePayloadPresent: server.includes('enriched.delivery_pack = buildDeliveryPack({'),
  artifactPresent: Boolean(artifact),
  landingReport: typeof artifact?.landing_report === 'object' && typeof artifact?.landing_report?.headline === 'string',
  distributionManifest: typeof artifact?.distribution_manifest === 'object' && Array.isArray(artifact?.distribution_manifest?.endpoints),
  humanSummary: typeof artifact?.human_handoff_summary === 'object' && typeof artifact?.human_handoff_summary?.suggested_owner === 'string',
  linksPointers: typeof artifact?.links_and_pointers === 'object' && typeof artifact?.links_and_pointers?.stakeholder_handoff === 'object',
  machineManifest: typeof artifact?.machine_readable_manifest === 'object' && Array.isArray(artifact?.machine_readable_manifest?.available_surfaces),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
