const fs = require('fs');
const path = require('path');
const { buildIosBoundedExecutionHooksLayer } = require('../backend/iosBoundedExecutionHooksLayer');

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
      { type: 'execution_result', owner, created_at: ts, payload: { owner, result: 'ios bounded execution hooks sample' } },
    ],
    result: {
      summary: 'ios bounded execution hooks sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('IOSHOOK-1', 'iOS bounded hook candidate', 'ios'),
    makeTask('IOSHOOK-2', 'Backend bridge context', 'backend'),
    makeTask('IOSHOOK-3', 'QA bridge context', 'qa', { assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildIosBoundedExecutionHooksLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'ios-bounded-execution-hooks.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
