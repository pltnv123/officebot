const fs = require('fs');
const path = require('path');
const { buildExportIndex } = require('../backend/exportIndexLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (28 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'export index sample' } },
    ],
    result: {
      summary: 'export index sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('INDEX-1', 'Prepare export navigation surface'),
    makeTask('INDEX-2', 'Escalated delivery routing', { assignment_state: 'escalated', approval_state: 'none', lock_conflict: true }),
    makeTask('INDEX-3', 'Queued external reporting review', { status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildExportIndex(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'export-index.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
