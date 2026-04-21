const fs = require('fs');
const path = require('path');
const { buildBoundedCoordinatorProgressionLayer } = require('../backend/boundedCoordinatorProgressionLayer');

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
      { type: 'execution_result', owner, created_at: ts, payload: { owner, result: 'bounded coordinator progression sample' } },
    ],
    result: {
      summary: 'bounded coordinator progression sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('PROGRESSION-1', 'Backend progression candidate', 'backend'),
    makeTask('PROGRESSION-2', 'iOS progression candidate', 'ios'),
    makeTask('PROGRESSION-3', 'QA progression candidate', 'qa', { assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

console.log('[progression-export] start');
console.log('[progression-export] before builder');
const report = buildBoundedCoordinatorProgressionLayer(runtime, 'cto');
console.log('[progression-export] after builder');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'bounded-coordinator-progression.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
console.log('[progression-export] artifact write');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
console.log('[progression-export] process exit');
