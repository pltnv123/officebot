const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionDispatchDecisionLayer } = require('../backend/assistedExecutionDispatchDecisionLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (14 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'decision sample' } },
    ],
    result: {
      summary: 'decision sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('DECISION-1', 'Backend dispatch decision review'),
    makeTask('DECISION-2', 'QA dispatch blocker decision', { title: 'QA dispatch blocker decision', assignment_state: 'escalated', approval_state: 'approval_pending', lock_conflict: true }),
    makeTask('DECISION-3', 'iOS launch readiness decision', { title: 'iOS launch readiness decision', status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildAssistedExecutionDispatchDecisionLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-dispatch-decision.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
