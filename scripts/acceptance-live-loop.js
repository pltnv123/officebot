const { buildRuntimeUiView } = require('../backend/uiStateView');
const { buildOperatorSurface } = require('../backend/operatorLayer');
const { executeOperatorAction } = require('../backend/operatorActions');

function assert(condition, code, detail, out) {
  out.checks.push({ code, ok: Boolean(condition), detail });
  if (!condition) out.ok = false;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseTask() {
  const now = new Date().toISOString();
  return {
    id: 'ACC-1',
    title: 'acceptance live loop',
    status: 'doing',
    assignment_state: 'retry',
    approval_state: 'approval_pending',
    lock_conflict: true,
    created_at: now,
    started_at: now,
    events: [
      { type: 'assigned', owner: 'orchestrator', created_at: now, payload: { owner: 'orchestrator' } },
      { type: 'execution_result', owner: 'backend', created_at: now, payload: { owner: 'backend' } },
    ],
    result: {},
  };
}

function run() {
  const out = { ok: true, checks: [], summary: {} };
  const task = baseTask();

  const runtime1 = { updatedAt: '2026-04-18T23:54:00.000Z', tasks: [clone(task)] };
  const ui1 = buildRuntimeUiView(runtime1);
  const operator1 = buildOperatorSurface(runtime1);
  const card1 = operator1.cards[0];
  const client1 = operator1.client_payload.tasks[0];

  assert(ui1.tasks.length === 1, 'minimal_live_loop.task_visible', 'task visible in ui runtime view', out);
  assert(Boolean(card1), 'operator_card.present', 'operator card built', out);
  assert(Array.isArray(client1.grouped_actions?.approval), 'grouped_actions.approval', 'approval group present', out);
  assert(Array.isArray(client1.grouped_actions?.repair), 'grouped_actions.repair', 'repair group present', out);
  assert(Array.isArray(client1.timeline) && client1.timeline.length >= 2, 'timeline.present', 'timeline exposed in client payload', out);
  assert(client1.live_state === 'retry', 'live_state.retry', `live_state=${client1.live_state}`, out);

  const actions = ['approve_task', 'reject_task', 'requeue_task', 'escalate_task', 'resolve_lock_conflict'];
  const results = {};
  for (const action of actions) {
    const executed = executeOperatorAction(clone(task), action);
    results[action] = executed;
  }

  assert(results.approve_task.result.status === 'ok' && results.approve_task.task.approval_state === 'approved', 'action.approve_task', 'approve transitions approval_state to approved', out);
  assert(results.reject_task.result.status === 'ok' && results.reject_task.task.approval_state === 'rejected', 'action.reject_task', 'reject transitions approval_state to rejected', out);
  assert(results.requeue_task.result.status === 'ok' && results.requeue_task.task.assignment_state === 'queued' && results.requeue_task.task.status === 'pending', 'action.requeue_task', 'requeue resets retry assignment into queued while keeping pending status', out);
  assert(results.escalate_task.result.status === 'ok' && results.escalate_task.task.assignment_state === 'escalated', 'action.escalate_task', 'escalate transitions assignment_state to escalated', out);
  assert(results.resolve_lock_conflict.result.status === 'ok' && results.resolve_lock_conflict.task.lock_conflict === false, 'action.resolve_lock_conflict', 'lock conflict resolved', out);

  const runtime2 = { updatedAt: '2026-04-18T23:55:00.000Z', tasks: [clone(task)] };
  const ui2 = buildRuntimeUiView(runtime2);
  const operator2 = buildOperatorSurface(runtime2);
  assert(ui2.reconnect_safe === true && ui2.backfill_safe === true, 'snapshot_safe.ui_flags', 'ui runtime remains reconnect/backfill safe', out);
  assert(operator2.client_payload.reconnect_safe === true && operator2.client_payload.backfill_safe === true, 'snapshot_safe.operator_flags', 'operator client payload remains reconnect/backfill safe', out);
  assert(operator2.client_payload.updatedAt !== operator1.client_payload.updatedAt, 'snapshot_safe.reread', 'fresh snapshot timestamp changes on reread', out);

  out.summary = {
    total_checks: out.checks.length,
    passed: out.checks.filter((item) => item.ok).length,
    failed: out.checks.filter((item) => !item.ok).length,
    client_live_state: client1.live_state,
    client_timeline_events: client1.timeline.length,
    operator_actions_checked: actions,
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}

run();
