const fs = require('fs');
const path = require('path');
const { buildKnowledgeAwareContext } = require('../backend/knowledgeAwareLayer');

function makeTask(id, title, extra = {}) {
  const ts = new Date(Date.now() - (20 * 60 * 1000)).toISOString();
  return {
    id,
    title,
    status: 'doing',
    assignment_state: 'retry',
    approval_state: 'approval_pending',
    created_at: ts,
    started_at: ts,
    updatedAt: ts,
    events: [
      { type: 'assigned', owner: 'orchestrator', created_at: ts, payload: { owner: 'orchestrator' } },
      { type: 'execution_result', owner: 'backend', created_at: ts, payload: { owner: 'backend', result: 'needs retrieval-aware routing' } },
    ],
    result: {
      summary: 'task needs knowledge-aware planning context',
      artifact_status: 'ready',
      artifacts: [],
    },
    ...extra,
  };
}

const runtime = {
  updatedAt: new Date().toISOString(),
  tasks: [
    makeTask('KNOW-1', 'Plan Supabase-backed routing context'),
    makeTask('KNOW-2', 'Review escalated orchestration blocker', { assignment_state: 'escalated', approval_state: 'none' }),
    makeTask('KNOW-3', 'Prepare QMD retrieval summary', { status: 'review', assignment_state: 'queued' }),
  ],
};

const report = buildKnowledgeAwareContext(runtime, 'cto');
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'knowledge-aware-context.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
