const { buildRuntimeUiView } = require('../backend/uiStateView');
const { buildOperatorSurface } = require('../backend/operatorLayer');
const { executeOperatorAction } = require('../backend/operatorActions');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, code, detail, out) {
  out.checks.push({ code, ok: Boolean(condition), detail });
  if (!condition) out.ok = false;
}

function makeTask() {
  const oldTs = new Date(Date.now() - (35 * 60 * 1000)).toISOString();
  return {
    id: 'E2E-OP-1',
    title: 'maintenance signal drives operator workflow',
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
      { type: 'execution_result', owner: 'backend', created_at: oldTs, payload: { owner: 'backend', result: 'retryable failure' } },
    ],
    result: {
      summary: 'retryable failure, awaiting operator decision',
      artifact_status: 'ready',
      artifacts: [
        {
          id: 'artifact-log-1',
          kind: 'log',
          path: 'tmp/operator-e2e.log',
          label: 'operator-e2e.log',
          status: 'ready',
          event_id: 'evt-1',
          task_id: 'E2E-OP-1',
        }
      ],
    },
  };
}

function run() {
  const out = { ok: true, checks: [], summary: {} };
  const baseTask = makeTask();
  const runtime = {
    updatedAt: new Date().toISOString(),
    actorRole: 'orchestrator',
    tasks: [clone(baseTask)],
  };

  const uiBefore = buildRuntimeUiView(runtime);
  const operatorBefore = buildOperatorSurface(runtime);
  const cardBefore = operatorBefore.cards[0];
  const clientBefore = operatorBefore.client_payload.tasks[0];
  const analyticsBefore = operatorBefore.analytics || {};

  assert(uiBefore.tasks[0]?.live_state === 'retry', 'ui.live_state.retry', `live_state=${uiBefore.tasks[0]?.live_state}`, out);
  assert(Boolean(cardBefore), 'operator.card.present', 'operator card is built', out);
  assert((cardBefore.hints || []).some((hint) => hint.action === 'resolve_approval'), 'operator.hint.approval', 'operator-facing approval hint present', out);
  assert((cardBefore.actions || []).some((action) => action.action === 'approve_task' && action.executable === true), 'operator.action.approve.visible', 'approve action visible and executable', out);
  assert((cardBefore.actions || []).some((action) => action.action === 'resolve_lock_conflict'), 'operator.action.lock.visible', 'lock resolution action visible', out);
  assert(analyticsBefore.maintenance_digest?.pending_total >= 2, 'analytics.maintenance.pending', `pending_total=${analyticsBefore.maintenance_digest?.pending_total}`, out);
  assert((analyticsBefore.maintenance_digest?.top_pending || []).length >= 2, 'analytics.maintenance.top_pending', 'maintenance digest exposes top pending routines', out);
  assert(String(analyticsBefore.export_summary?.retries || 0) === '1', 'analytics.export.retries', `export retries=${analyticsBefore.export_summary?.retries}`, out);
  assert((clientBefore.actions || []).length > 0, 'client.actions.visible', 'client payload exposes operator actions', out);
  assert(typeof (cardBefore.audit_digest?.human_review_text || '') === 'string' && cardBefore.audit_digest.human_review_text.includes('Состояние:'), 'client.audit.text', 'human review text available for client surface', out);

  const afterLock = executeOperatorAction(clone(baseTask), 'resolve_lock_conflict', 'orchestrator');
  assert(afterLock.result.status === 'ok' && afterLock.task.lock_conflict === false, 'action.lock_conflict.executed', 'resolve_lock_conflict clears conflict', out);

  const afterApprove = executeOperatorAction(clone(afterLock.task), 'approve_task', 'orchestrator');
  assert(afterApprove.result.status === 'ok' && afterApprove.task.approval_state === 'approved', 'action.approve.executed', 'approve_task updates approval_state', out);

  const afterRequeue = executeOperatorAction(clone(afterApprove.task), 'requeue_task', 'orchestrator');
  assert(afterRequeue.result.status === 'ok' && afterRequeue.task.status === 'pending', 'action.requeue.executed', 'requeue_task moves task to pending', out);

  const runtimeAfter = {
    updatedAt: new Date().toISOString(),
    actorRole: 'orchestrator',
    tasks: [clone(afterRequeue.task)],
  };
  const uiAfter = buildRuntimeUiView(runtimeAfter);
  const operatorAfter = buildOperatorSurface(runtimeAfter);
  const cardAfter = operatorAfter.cards[0];
  const clientAfter = operatorAfter.client_payload.tasks[0];
  const analyticsAfter = operatorAfter.analytics || {};

  assert(uiAfter.tasks[0]?.live_state === 'queued', 'ui.transition.queued', `live_state=${uiAfter.tasks[0]?.live_state}`, out);
  assert(cardAfter.approval_state === 'approved', 'card.approval.approved', `approval_state=${cardAfter.approval_state}`, out);
  assert((cardAfter.actions || []).every((action) => action.action !== 'approve_task'), 'card.approve.removed', 'approval action removed after execution', out);
  assert(analyticsAfter.approval_pending === 0, 'analytics.approval.cleared', `approval_pending=${analyticsAfter.approval_pending}`, out);
  assert(analyticsAfter.lock_conflicts === 0, 'analytics.conflict.cleared', `lock_conflicts=${analyticsAfter.lock_conflicts}`, out);
  assert((analyticsAfter.maintenance_digest?.top_pending || []).every((item) => item.type !== 'retry_followup') && (analyticsAfter.maintenance_digest?.pending_total || 0) === 1, 'analytics.maintenance.updated', 'maintenance digest drops retry followup after requeue and keeps only remaining pending item', out);
  assert(analyticsAfter.export_summary?.approvals === 0 && analyticsAfter.export_summary?.conflicts === 0, 'export.summary.updated', 'export summary reflects resolved approval/conflict', out);
  assert(clientAfter.live_state === 'queued', 'client.transition.queued', `client live_state=${clientAfter.live_state}`, out);
  assert((clientAfter.timeline || []).some((event) => event.type === 'operator_action'), 'client.timeline.operator_action', 'client timeline includes operator_action audit events', out);
  assert(operatorAfter.client_payload.reconnect_safe === true && operatorAfter.client_payload.backfill_safe === true, 'snapshot.flags.safe', 'client payload remains reconnect/backfill safe', out);

  out.summary = {
    total_checks: out.checks.length,
    passed: out.checks.filter((item) => item.ok).length,
    failed: out.checks.filter((item) => !item.ok).length,
    before: {
      live_state: uiBefore.tasks[0]?.live_state,
      approval_pending: analyticsBefore.approval_pending,
      lock_conflicts: analyticsBefore.lock_conflicts,
      pending_maintenance: analyticsBefore.maintenance_digest?.pending_total || 0,
      export_summary: analyticsBefore.export_summary || {},
    },
    after: {
      live_state: uiAfter.tasks[0]?.live_state,
      approval_pending: analyticsAfter.approval_pending,
      lock_conflicts: analyticsAfter.lock_conflicts,
      pending_maintenance: analyticsAfter.maintenance_digest?.pending_total || 0,
      export_summary: analyticsAfter.export_summary || {},
    },
    actions_executed: ['resolve_lock_conflict', 'approve_task', 'requeue_task'],
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}

run();
