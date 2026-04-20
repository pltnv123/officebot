const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionDispatchOrchestrationPreflightLayer } = require('../backend/assistedExecutionDispatchOrchestrationPreflightLayer');

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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'orchestration preflight sample' } },
    ],
    result: {
      summary: 'orchestration preflight sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('PREF-1', 'Backend orchestration preflight'),
    makeTask('PREF-2', 'Escalated QA preflight blocker', { title: 'QA preflight blocker', assignment_state: 'escalated', approval_state: 'approval_pending', lock_conflict: true }),
    makeTask('PREF-3', 'iOS dependency preflight', { title: 'iOS dependency preflight', status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildAssistedExecutionDispatchOrchestrationPreflightLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-dispatch-orchestration-preflight.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
