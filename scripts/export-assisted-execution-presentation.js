const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionPresentation } = require('../backend/assistedExecutionPresentationLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (21 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'presentation sample' } },
    ],
    result: {
      summary: 'presentation sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('PRESENT-1', 'Show readiness outputs in CTO panel'),
    makeTask('PRESENT-2', 'Escalated handoff presentation', { assignment_state: 'escalated', approval_state: 'none', lock_conflict: true }),
    makeTask('PRESENT-3', 'Queued guidance presentation', { status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildAssistedExecutionPresentation(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-presentation.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
