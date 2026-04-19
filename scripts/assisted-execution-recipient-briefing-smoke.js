const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionRecipientBriefingLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-recipient-briefing.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionRecipientBriefing') && layer.includes('curated_recipient_briefs') && layer.includes('briefing_payload'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-recipient-briefing'") && server.includes('assisted_execution_recipient_briefing: buildAssistedExecutionRecipientBriefing'),
  statePayloadPresent: server.includes('enriched.assisted_execution_recipient_briefing = buildAssistedExecutionRecipientBriefing({'),
  artifactPresent: Boolean(artifact),
  recipientBriefs: typeof artifact?.curated_recipient_briefs === 'object' && typeof artifact?.curated_recipient_briefs?.cto === 'object',
  briefingPriorities: typeof artifact?.briefing_priorities === 'object' && Array.isArray(artifact?.briefing_priorities?.top_recommendations),
  consumptionViews: typeof artifact?.per_recipient_consumption_views === 'object' && typeof artifact?.per_recipient_consumption_views?.stakeholder === 'object',
  summaryPayload: typeof artifact?.recipient_summary_payload === 'object' && artifact?.recipient_summary_payload?.consumer_ready === true,
  surfacePointers: typeof artifact?.recipient_surface_pointers === 'object' && typeof artifact?.recipient_surface_pointers?.index === 'object',
  briefingPayload: typeof artifact?.briefing_payload === 'object' && Array.isArray(artifact?.briefing_payload?.recipients),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
