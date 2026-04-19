const fs = require('fs');
const path = require('path');
const { buildDecisionAssistanceSurface } = require('../backend/decisionAssistanceLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (24 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'decision assistance sample' } },
    ],
    result: {
      summary: 'decision assistance sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('ASSIST-1', 'Plan routing recommendations for operator review'),
    makeTask('ASSIST-2', 'Review escalated workflow blocker', { assignment_state: 'escalated', approval_state: 'none', lock_conflict: true }),
    makeTask('ASSIST-3', 'Queue reporting follow-up with retrieval context', { status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildDecisionAssistanceSurface(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'decision-assistance.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
