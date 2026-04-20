const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionLaneHandoffLayer } = require('../backend/assistedExecutionLaneHandoffLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (11 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'lane handoff sample' } },
    ],
    result: {
      summary: 'lane handoff sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('HANDOFF-1', 'Backend API stabilization task'),
    makeTask('HANDOFF-2', 'iOS release handoff packet'),
    makeTask('HANDOFF-3', 'QA regression verification task', { title: 'QA regression verification task', assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildAssistedExecutionLaneHandoffLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-lane-handoff.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
