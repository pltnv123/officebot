const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionOperatorReleaseReviewLayer } = require('../backend/assistedExecutionOperatorReleaseReviewLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (6 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'operator release review sample' } },
    ],
    result: {
      summary: 'operator release review sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('RELEASE-1', 'Backend release review task'),
    makeTask('RELEASE-2', 'iOS release review task'),
    makeTask('RELEASE-3', 'QA release review validation', { title: 'QA release review validation', assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildAssistedExecutionOperatorReleaseReviewLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-operator-release-review.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
