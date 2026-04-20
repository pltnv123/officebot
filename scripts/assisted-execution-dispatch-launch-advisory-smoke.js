const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDispatchLaunchAdvisoryLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-dispatch-launch-advisory.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionDispatchLaunchAdvisoryLayer') && layer.includes('launch_advisories') && layer.includes('dispatch_activation_posture'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-dispatch-launch-advisory'") && server.includes('assisted_execution_dispatch_launch_advisory: buildAssistedExecutionDispatchLaunchAdvisoryLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_dispatch_launch_advisory = buildAssistedExecutionDispatchLaunchAdvisoryLayer({'),
  artifactPresent: Boolean(artifact),
  advisories: Array.isArray(artifact?.launch_advisories) && artifact.launch_advisories.length >= 1,
  startWindowSignals: typeof artifact?.start_window_signals === 'object' && typeof artifact?.start_window_signals?.go_no_go === 'string',
  holdReasons: Array.isArray(artifact?.orchestration_hold_reasons),
  activationPosture: typeof artifact?.dispatch_activation_posture === 'object' && typeof artifact?.dispatch_activation_posture?.posture === 'string',
  advisorySummary: typeof artifact?.advisory_summary === 'object' && typeof artifact?.advisory_summary?.advisory_total === 'number',
  payloadPresent: typeof artifact?.advisory_payload === 'object' && artifact?.advisory_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
