const fs = require('fs');
const path = require('path');
const { buildQaExecutorRuntimeLayer } = require('../backend/qaExecutorRuntimeLayer');

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
      { type: 'execution_result', owner: 'qa', created_at: ts, payload: { owner: 'qa', result: 'qa executor runtime sample' } },
    ],
    result: {
      summary: 'qa executor runtime sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('QA-EXEC-1', 'QA runtime candidate'),
    makeTask('QA-EXEC-2', 'Backend runtime reference'),
    makeTask('QA-EXEC-3', 'iOS runtime reference', { assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildQaExecutorRuntimeLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'qa-executor-runtime.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
