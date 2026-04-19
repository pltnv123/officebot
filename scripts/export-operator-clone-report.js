const fs = require('fs');
const path = require('path');
const { buildOperatorSurface } = require('../backend/operatorLayer');
const { buildRuntimeUiView } = require('../backend/uiStateView');
const { executeOperatorAction } = require('../backend/operatorActions');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeCloneTask() {
  const oldTs = new Date(Date.now() - (40 * 60 * 1000)).toISOString();
  return {
    id: 'CLONE-OP-1',
    title: 'isolated runtime clone operator flow',
    status: 'doing',
    assignment_state: 'retry',
    approval_state: 'approval_pending',
    lock_conflict: true,
    created_at: oldTs,
    started_at: oldTs,
    updatedAt: oldTs,
    max_attempts: 3,
    attempts: 2,
    events: [
      { type: 'assigned', owner: 'orchestrator', created_at: oldTs, payload: { owner: 'orchestrator' } },
      { type: 'execution_result', owner: 'backend', created_at: oldTs, payload: { owner: 'backend', result: 'retryable clone failure' } },
    ],
    result: {
      summary: 'retryable clone failure awaiting operator decision',
      artifact_status: 'ready',
      artifacts: [
        { id: 'clone-artifact-1', kind: 'log', path: 'tmp/clone-runtime.log', label: 'clone-runtime.log', status: 'ready' },
      ],
    },
  };
}

function summarize(task, actorRole = 'orchestrator', updatedAt = new Date().toISOString()) {
  const runtime = { updatedAt, actorRole, tasks: [clone(task)] };
  const operator = buildOperatorSurface(runtime);
  return {
    updatedAt,
    actorRole,
    ui: buildRuntimeUiView(runtime),
    operator,
    card: operator.cards[0],
    clientTask: operator.client_payload.tasks[0],
  };
}

function scenario(baseTask, action) {
  const before = summarize(baseTask, 'orchestrator', '2026-04-19T11:45:00.000Z');
  const executed = executeOperatorAction(clone(baseTask), action, 'orchestrator');
  const after = summarize(executed.task, 'orchestrator', '2026-04-19T11:46:00.000Z');
  const qaView = summarize(baseTask, 'qa', '2026-04-19T11:45:30.000Z');
  return {
    action,
    result: executed.result,
    before: {
      live_state: before.clientTask.live_state,
      hints: (before.card.hints || []).map((item) => item.action),
      actions: (before.card.actions || []).map((item) => ({ action: item.action, executable: item.executable !== false })),
    },
    after: {
      live_state: after.clientTask.live_state,
      approval_state: executed.task.approval_state || null,
      assignment_state: executed.task.assignment_state || null,
      lock_conflict: Boolean(executed.task.lock_conflict),
      analytics: after.operator.analytics,
      export_summary: after.operator.analytics?.export_summary || {},
      top_pending: after.operator.analytics?.maintenance_digest?.top_pending || [],
      timeline_types: (after.clientTask.timeline || []).map((event) => event.type),
    },
    qa_view_only_actions: (qaView.card.actions || []).filter((item) => item.executable === false).map((item) => item.action),
  };
}

function buildReport() {
  const baseTask = makeCloneTask();
  return {
    generatedAt: new Date().toISOString(),
    kind: 'operator-clone-acceptance-report',
    source: 'isolated-runtime-clone',
    stableMilestone: 'isolated runtime clone workflows',
    scenarios: {
      approval: scenario(baseTask, 'approve_task'),
      reject: scenario(baseTask, 'reject_task'),
      requeue: scenario(baseTask, 'requeue_task'),
      escalate: scenario(baseTask, 'escalate_task'),
      lock_conflict_resolution: scenario(baseTask, 'resolve_lock_conflict'),
    },
  };
}

const report = buildReport();
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'operator-clone-acceptance-report.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, scenarios: Object.keys(report.scenarios) }, null, 2));
