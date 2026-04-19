const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionBundleIndex } = require('../backend/assistedExecutionBundleIndexLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (19 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'bundle index sample' } },
    ],
    result: {
      summary: 'bundle index sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('INDEX-1', 'Index assisted execution delivery surfaces'),
    makeTask('INDEX-2', 'Escalated index routing', { assignment_state: 'escalated', approval_state: 'none', lock_conflict: true }),
    makeTask('INDEX-3', 'Queued presentation publishing route', { status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildAssistedExecutionBundleIndex(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-bundle-index.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
