const fs = require('fs');
const path = require('path');
const { buildRealBoundedCoordinatorProgressionEngineLayer } = require('../backend/realBoundedCoordinatorProgressionEngineLayer');

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
      { type: 'execution_result', owner, created_at: ts, payload: { owner, result: 'real bounded coordinator progression engine sample' } },
    ],
    result: {
      summary: 'real bounded coordinator progression engine sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('ENGINE-1', 'Backend engine candidate', 'backend'),
    makeTask('ENGINE-2', 'iOS engine candidate', 'ios'),
    makeTask('ENGINE-3', 'QA engine candidate', 'qa', { assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

console.log('[real-engine-export] start');
console.log('[real-engine-export] before builder');
const report = buildRealBoundedCoordinatorProgressionEngineLayer(runtime, 'cto');
console.log('[real-engine-export] after builder');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'real-bounded-coordinator-progression-engine.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
console.log('[real-engine-export] artifact write');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
console.log('[real-engine-export] process exit');
