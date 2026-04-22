const fs = require('fs');
const path = require('path');
const { buildOperatorProgressionReviewLayer } = require('../backend/operatorProgressionReviewLayer');

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
      { type: 'execution_result', owner, created_at: ts, payload: { owner, result: 'operator progression review sample' } },
    ],
    result: {
      summary: 'operator progression review sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('OPR-1', 'Backend progression candidate', 'backend'),
    makeTask('OPR-2', 'iOS progression candidate', 'ios'),
    makeTask('OPR-3', 'QA progression candidate', 'qa', { assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

console.log('[operator-progression-review] start');
console.log('[operator-progression-review] before builder');
const report = buildOperatorProgressionReviewLayer(runtime, 'cto');
console.log('[operator-progression-review] after builder');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'operator-progression-review.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log('[operator-progression-review] artifact write');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
console.log('[operator-progression-review] process exit');
