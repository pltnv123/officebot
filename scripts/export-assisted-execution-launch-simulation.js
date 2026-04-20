const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionLaunchSimulationLayer } = require('../backend/assistedExecutionLaunchSimulationLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (7 * 60 * 1000)).toISOString();
  return {
    id,
    title,
    status: 'doing',
    assignment_state: 'retry',
    approval_state: 'approval_pending',
    lock_conflict: false,
    created_at: ts,
    started_at: ts,
    updatedAt: ts,
    max_attempts: 3,
    attempts: 2,
    events: [
      { type: 'assigned', owner: 'orchestrator', created_at: ts, payload: { owner: 'orchestrator' } },
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'launch simulation sample' } },
    ],
    result: {
      summary: 'launch simulation sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('SIM-1', 'Backend launch simulation task'),
    makeTask('SIM-2', 'iOS launch simulation task'),
    makeTask('SIM-3', 'QA launch simulation validation', { title: 'QA launch simulation validation', assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildAssistedExecutionLaunchSimulationLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-launch-simulation.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
