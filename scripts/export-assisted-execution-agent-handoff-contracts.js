const fs = require('fs');
const path = require('path');
const { buildAssistedExecutionAgentHandoffContractsLayer } = require('../backend/assistedExecutionAgentHandoffContractsLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (9 * 60 * 1000)).toISOString();
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
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'handoff contract sample' } },
    ],
    result: {
      summary: 'handoff contract sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('CONTRACT-1', 'Backend contract framing task'),
    makeTask('CONTRACT-2', 'iOS contract framing task'),
    makeTask('CONTRACT-3', 'QA contract validation task', { title: 'QA contract validation task', assignment_state: 'escalated', approval_state: 'approval_pending' }),
  ],
};

const report = buildAssistedExecutionAgentHandoffContractsLayer(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'assisted-execution-agent-handoff-contracts.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
