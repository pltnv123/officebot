const fs = require('fs');
const path = require('path');
const { buildBoundedExecutionReviewHandoffLayer } = require('../backend/boundedExecutionReviewHandoffLayer');
console.log('[handoff-export] start');

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
      { type: 'execution_result', owner, created_at: ts, payload: { owner, result: 'bounded execution review handoff sample' } },
    ],
    result: {
      summary: 'bounded execution review handoff sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('HANDOFF-1', 'Backend handoff candidate', 'backend'),
    makeTask('HANDOFF-2', 'iOS handoff candidate', 'ios'),
    makeTask('HANDOFF-3', 'QA handoff candidate', 'qa', { assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

console.log('[handoff-export] before builder');
const report = buildBoundedExecutionReviewHandoffLayer(runtime, 'cto');
console.log('[handoff-export] after builder');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'bounded-execution-review-handoff.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
console.log('[handoff-export] artifact write');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
console.log('[handoff-export] process exit');
