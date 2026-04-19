const fs = require('fs');
const server = fs.readFileSync('./backend/server.js', 'utf8');
const layer = fs.readFileSync('./backend/assistedExecutionDispatchLayer.js', 'utf8');
const reportPath = './docs/artifacts/assisted-execution-dispatch.json';
const artifact = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;

const checks = {
  layerExported: layer.includes('buildAssistedExecutionDispatchLayer') && layer.includes('dispatch_recommendations') && layer.includes('execution_priority_queue'),
  endpointPresent: server.includes("app.get('/api/export/assisted-execution-dispatch'") && server.includes('assisted_execution_dispatch: buildAssistedExecutionDispatchLayer'),
  statePayloadPresent: server.includes('enriched.assisted_execution_dispatch = buildAssistedExecutionDispatchLayer({'),
  artifactPresent: Boolean(artifact),
  dispatchRecommendations: Array.isArray(artifact?.dispatch_recommendations) && artifact.dispatch_recommendations.length >= 1,
  assignmentCandidates: Array.isArray(artifact?.recipient_assignment_candidates) && artifact.recipient_assignment_candidates.length >= 1,
  priorityQueue: Array.isArray(artifact?.execution_priority_queue) && artifact.execution_priority_queue.length >= 1,
  taskAgentMapping: Array.isArray(artifact?.task_to_agent_mapping_suggestions) && artifact.task_to_agent_mapping_suggestions.length >= 1,
  dispatchLanes: typeof artifact?.dispatch_lanes === 'object' && typeof artifact?.dispatch_lanes?.by_role === 'object',
  payloadPresent: typeof artifact?.dispatch_payload === 'object' && artifact?.dispatch_payload?.read_only === true,
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some(v => !v)) process.exit(1);
