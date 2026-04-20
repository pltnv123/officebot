const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionDispatchActivationReviewLayer } = require('../backend/assistedExecutionDispatchActivationReviewLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (16 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'activation review sample' } },
    ],
    result: {
      summary: 'activation review sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('REVIEW-1', 'Backend activation review'),
    makeTask('REVIEW-2', 'Escalated QA launch blocker review', { title: 'QA launch blocker review', assignment_state: 'escalated', approval_state: 'approval_pending', lock_conflict: true }),
    makeTask('REVIEW-3', 'iOS activation review signal', { title: 'iOS activation review signal', status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildAssistedExecutionDispatchActivationReviewLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-dispatch-activation-review.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
