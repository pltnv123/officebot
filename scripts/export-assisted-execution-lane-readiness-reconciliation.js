const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionLaneReadinessReconciliationLayer } = require('../backend/assistedExecutionLaneReadinessReconciliationLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (10 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'lane reconciliation sample' } },
    ],
    result: {
      summary: 'lane reconciliation sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('RECON-1', 'Backend dependency alignment'),
    makeTask('RECON-2', 'iOS release dependency alignment'),
    makeTask('RECON-3', 'QA readiness blocker review', { title: 'QA readiness blocker review', assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildAssistedExecutionLaneReadinessReconciliationLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-lane-readiness-reconciliation.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
