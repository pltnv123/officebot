const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionDispatchReadinessLayer } = require('../backend/assistedExecutionDispatchReadinessLayer');

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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'dispatch readiness sample' } },
    ],
    result: {
      summary: 'dispatch readiness sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('READY-1', 'Backend dispatch readiness check'),
    makeTask('READY-2', 'Escalated QA readiness blocker', { title: 'QA readiness blocker', assignment_state: 'escalated', approval_state: 'approval_pending', lock_conflict: true }),
    makeTask('READY-3', 'iOS dispatch lane monitoring', { title: 'iOS dispatch lane monitoring', status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildAssistedExecutionDispatchReadinessLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-dispatch-readiness.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
