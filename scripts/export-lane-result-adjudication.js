const fs = require('fs');
const path = require('path');
const { buildLaneResultAdjudicationLayer } = require('../backend/laneResultAdjudicationLayer');

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
      { type: 'execution_result', owner, created_at: ts, payload: { owner, result: 'lane result adjudication sample' } },
    ],
    result: {
      summary: 'lane result adjudication sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('ADJ-1', 'Backend adjudication candidate', 'backend'),
    makeTask('ADJ-2', 'iOS adjudication candidate', 'ios'),
    makeTask('ADJ-3', 'QA adjudication candidate', 'qa', { assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildLaneResultAdjudicationLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'lane-result-adjudication.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
