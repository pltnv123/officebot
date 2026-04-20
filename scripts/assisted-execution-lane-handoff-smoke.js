const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionLaneHandoffLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-lane-handoff.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionLaneHandoffLayer') && layer.includes('lane_handoff_packets') && layer.includes('backend_lane_packet') && layer.includes('ios_lane_packet') && layer.includes('qa_lane_packet'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-lane-handoff'") && server.includes('assisted_execution_lane_handoff: buildAssistedExecutionLaneHandoffLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_lane_handoff = buildAssistedExecutionLaneHandoffLayer({'),
  artifactPresent: Boolean(artifact),
  lanePackets: Array.isArray(artifact?.lane_handoff_packets) && artifact.lane_handoff_packets.length === 3,
  backendPacket: typeof artifact?.backend_lane_packet === 'object' && artifact?.backend_lane_packet?.lane === 'backend',
  iosPacket: typeof artifact?.ios_lane_packet === 'object' && artifact?.ios_lane_packet?.lane === 'ios',
  qaPacket: typeof artifact?.qa_lane_packet === 'object' && artifact?.qa_lane_packet?.lane === 'qa',
  handoffSummary: typeof artifact?.lane_handoff_summary === 'object' && typeof artifact?.lane_handoff_summary?.lane_total === 'number',
  payloadPresent: typeof artifact?.lane_handoff_payload === 'object' && artifact?.lane_handoff_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
