const fs = require('fs');
const path = require('path');
const { buildBackendExecutorRuntimeLayer } = require('../backend/backendExecutorRuntimeLayer');

function makeTask(id, title, extra = {}) {
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'backend executor runtime sample' } },
    ],
    result: {
      summary: 'backend executor runtime sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('BACKEND-EXEC-1', 'Backend runtime candidate'),
    makeTask('BACKEND-EXEC-2', 'iOS runtime reference'),
    makeTask('BACKEND-EXEC-3', 'QA runtime reference', { assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildBackendExecutorRuntimeLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'backend-executor-runtime.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
