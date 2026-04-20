const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionDispatchGovernanceFinalizationLayer } = require('../backend/assistedExecutionDispatchGovernanceFinalizationLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (12 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'governance finalization sample' } },
    ],
    result: {
      summary: 'governance finalization sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('GOV-1', 'Backend governance finalization review'),
    makeTask('GOV-2', 'QA governance blocker finalization', { title: 'QA governance blocker finalization', assignment_state: 'escalated', approval_state: 'approval_pending', lock_conflict: true }),
    makeTask('GOV-3', 'iOS handoff readiness governance', { title: 'iOS handoff readiness governance', status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildAssistedExecutionDispatchGovernanceFinalizationLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-dispatch-governance-finalization.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
