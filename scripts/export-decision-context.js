const fs = require('fs');
const path = require('path');
const { buildDecisionConsumerSurface } = require('../backend/knowledgeAwareLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (25 * 60 * 1000)).toISOString();
  return {
    id,
    title,
    status: 'doing',
    assignment_state: 'retry',
    approval_state: 'approval_pending',
    created_at: ts,
    started_at: ts,
    updatedAt: ts,
    events: [
      { type: 'assigned', owner: 'orchestrator', created_at: ts, payload: { owner: 'orchestrator' } },
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'decision context needed' } },
    ],
    result: {
      summary: 'decision context should include retrieval and memory hints',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('DEC-1', 'Review approval-pending routing path'),
    makeTask('DEC-2', 'Inspect escalated blocker with prior context', { assignment_state: 'escalated', approval_state: 'none' }),
    makeTask('DEC-3', 'Route queued retrieval follow-up', { status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildDecisionConsumerSurface(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'decision-context.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
