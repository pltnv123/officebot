const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionAgentHandoffContractsLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-agent-handoff-contracts.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionAgentHandoffContractsLayer') && layer.includes('backend_handoff_contract') && layer.includes('handoff_contract_matrix') && layer.includes('handoff_contract_payload'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-agent-handoff-contracts'") && server.includes('assisted_execution_agent_handoff_contracts: buildAssistedExecutionAgentHandoffContractsLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_agent_handoff_contracts = buildAssistedExecutionAgentHandoffContractsLayer({'),
  artifactPresent: Boolean(artifact),
  backendContract: typeof artifact?.backend_handoff_contract === 'object' && artifact?.backend_handoff_contract?.lane === 'backend',
  iosContract: typeof artifact?.ios_handoff_contract === 'object' && artifact?.ios_handoff_contract?.lane === 'ios',
  qaContract: typeof artifact?.qa_handoff_contract === 'object' && artifact?.qa_handoff_contract?.lane === 'qa',
  contractMatrix: Array.isArray(artifact?.handoff_contract_matrix) && artifact.handoff_contract_matrix.length === 3,
  contractSummary: typeof artifact?.handoff_contract_summary === 'object' && typeof artifact?.handoff_contract_summary?.contract_total === 'number',
  payloadPresent: typeof artifact?.handoff_contract_payload === 'object' && artifact?.handoff_contract_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
