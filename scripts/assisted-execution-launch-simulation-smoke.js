const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionLaunchSimulationLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-launch-simulation.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionLaunchSimulationLayer') && layer.includes('backend_launch_simulation') && layer.includes('launch_simulation_matrix') && layer.includes('launch_simulation_payload'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-launch-simulation'") && server.includes('assisted_execution_launch_simulation: buildAssistedExecutionLaunchSimulationLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_launch_simulation = buildAssistedExecutionLaunchSimulationLayer({'),
  artifactPresent: Boolean(artifact),
  backendSimulation: typeof artifact?.backend_launch_simulation === 'object' && artifact?.backend_launch_simulation?.agent === 'backend',
  iosSimulation: typeof artifact?.ios_launch_simulation === 'object' && artifact?.ios_launch_simulation?.agent === 'ios',
  qaSimulation: typeof artifact?.qa_launch_simulation === 'object' && artifact?.qa_launch_simulation?.agent === 'qa',
  simulationMatrix: Array.isArray(artifact?.launch_simulation_matrix) && artifact.launch_simulation_matrix.length === 3,
  simulationSummary: typeof artifact?.launch_simulation_summary === 'object' && typeof artifact?.launch_simulation_summary?.simulation_total === 'number',
  payloadPresent: typeof artifact?.launch_simulation_payload === 'object' && artifact?.launch_simulation_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
