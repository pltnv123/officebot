const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionEnvelopeLayer } = require('../backend/assistedExecutionEnvelopeLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (8 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'execution envelope sample' } },
    ],
    result: {
      summary: 'execution envelope sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('ENV-1', 'Backend execution envelope task'),
    makeTask('ENV-2', 'iOS execution envelope task'),
    makeTask('ENV-3', 'QA execution envelope validation', { title: 'QA execution envelope validation', assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildAssistedExecutionEnvelopeLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-envelope.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
