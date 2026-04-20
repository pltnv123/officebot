const fs = require('fs');
const path = require('path');
const { buildExecutorCoordinationStateTransitionsLayer } = require('../backend/executorCoordinationStateTransitionsLayer');

function makeTask(id, title, owner, extra = {}) {
  const ts = new Date(Date.now() - (3 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner, created_at: ts, payload: { owner, result: 'executor coordination state transitions sample' } },
    ],
    result: {
      summary: 'executor coordination state transitions sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('TRANS-1', 'Backend transition candidate', 'backend'),
    makeTask('TRANS-2', 'iOS transition candidate', 'ios'),
    makeTask('TRANS-3', 'QA transition candidate', 'qa', { assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildExecutorCoordinationStateTransitionsLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'executor-coordination-state-transitions.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
