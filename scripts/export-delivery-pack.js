const fs = require('fs');
const path = require('path');
const { buildDeliveryPack } = require('../backend/deliveryPackLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (26 * 60 * 1000)).toISOString();
  return {
    id,
    title,
    status: 'doing',
    assignment_state: 'retry',
    approval_state: 'approval_pending',
    created_at: ts,
    started_at: ts,
    updatedAt: ts,
    max_attempts: 3,
    attempts: 2,
    events: [
      { type: 'assigned', owner: 'orchestrator', created_at: ts, payload: { owner: 'orchestrator' } },
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'delivery pack sample' } },
    ],
    result: {
      summary: 'delivery pack sample task',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('PACK-1', 'Prepare curated delivery pack'),
    makeTask('PACK-2', 'Escalated stakeholder routing', { assignment_state: 'escalated', approval_state: 'none', lock_conflict: true }),
    makeTask('PACK-3', 'Queued export review', { status: 'review', assignment_state: 'queued', approval_state: 'none' }),
  ],
};

const report = buildDeliveryPack(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'delivery-pack.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
