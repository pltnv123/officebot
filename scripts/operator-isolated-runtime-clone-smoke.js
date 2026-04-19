const fs = require('fs');
const path = require('path');
const { buildOperatorSurface } = require('../backend/operatorLayer');
const { buildRuntimeUiView } = require('../backend/uiStateView');
const { executeOperatorAction } = require('../backend/operatorActions');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, code, detail, out) {
  out.checks.push({ code, ok: Boolean(condition), detail });
  if (!condition) out.ok = false;
}

function readStaticWiring() {
  const server = fs.readFileSync(path.join(__dirname, '..', 'backend', 'server.js'), 'utf8');
  const uiJs = fs.readFileSync(path.join(__dirname, 'tasks-ui.js'), 'utf8');
  return { server, uiJs };
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
  return {
    ui: buildRuntimeUiView(runtime),
    operator: buildOperatorSurface(runtime),
    clientTask: buildOperatorSurface(runtime).client_payload.tasks[0],
    card: buildOperatorSurface(runtime).cards[0],
  };
}

function runScenario(baseTask, action, actorRole = 'orchestrator') {
  const before = summarize(baseTask, actorRole, '2026-04-19T11:45:00.000Z');
  const executed = executeOperatorAction(clone(baseTask), action, actorRole);
  const after = summarize(executed.task, actorRole, '2026-04-19T11:46:00.000Z');
  const qaView = summarize(baseTask, 'qa', '2026-04-19T11:45:30.000Z');
  return { before, executed, after, qaView };
}

function run() {
  const out = { ok: true, checks: [], summary: {} };
  const baseTask = makeCloneTask();
  const { server, uiJs } = readStaticWiring();
  const originalSnapshot = JSON.stringify(baseTask);

  const scenarios = {
    approval: runScenario(baseTask, 'approve_task'),
    reject: runScenario(baseTask, 'reject_task'),
    requeue: runScenario(baseTask, 'requeue_task'),
    escalate: runScenario(baseTask, 'escalate_task'),
    lockConflict: runScenario(baseTask, 'resolve_lock_conflict'),
  };

  assert(baseTask.approval_state === 'approval_pending' && JSON.stringify(baseTask) === originalSnapshot, 'clone.base.unchanged', 'base isolated task remains unchanged after all scenario runs', out);

  const beforeCard = scenarios.approval.before.card;
  assert(Boolean(beforeCard), 'operator.card.present', 'operator card exists on isolated runtime clone', out);
  assert((beforeCard.hints || []).some((hint) => hint.action === 'resolve_approval'), 'operator.hints.present', 'operator hints include approval pointer on clone', out);
  assert((beforeCard.actions || []).some((entry) => entry.action === 'approve_task' && entry.executable === true), 'operator.actions.present', 'operator actions are visible/executable on clone', out);
  assert((scenarios.approval.qaView.card.actions || []).some((entry) => entry.action === 'requeue_task' && entry.executable === false), 'role.aware.viewonly', 'QA clone view keeps role-aware view-only action', out);

  assert(scenarios.approval.executed.result.status === 'ok' && scenarios.approval.executed.task.approval_state === 'approved', 'approval.result', 'approval action executes correctly', out);
  assert(scenarios.reject.executed.result.status === 'ok' && scenarios.reject.executed.task.approval_state === 'rejected', 'reject.result', 'reject action executes correctly', out);
  assert(scenarios.requeue.executed.result.status === 'ok' && scenarios.requeue.executed.task.assignment_state === 'queued' && scenarios.requeue.executed.task.status === 'pending', 'requeue.result', 'requeue action executes correctly on clone', out);
  assert(scenarios.escalate.executed.result.status === 'ok' && scenarios.escalate.executed.task.assignment_state === 'escalated', 'escalate.result', 'escalate action executes correctly', out);
  assert(scenarios.lockConflict.executed.result.status === 'ok' && scenarios.lockConflict.executed.task.lock_conflict === false, 'lock.result', 'lock conflict resolution executes correctly', out);

  assert(scenarios.approval.after.operator.analytics?.approval_pending === 0, 'approval.analytics', 'approval clears analytics approval_pending', out);
  assert(scenarios.reject.after.operator.analytics?.approval_pending === 0, 'reject.analytics', 'reject clears analytics approval_pending', out);
  assert(scenarios.requeue.after.operator.analytics?.export_summary?.by_live_state?.queued === 1, 'requeue.export', 'requeue updates export visibility to queued', out);
  assert(scenarios.escalate.after.operator.analytics?.by_live_state?.failed === 1 && scenarios.escalate.after.operator.analytics?.maintenance_digest?.urgent_total === 1 && scenarios.escalate.after.operator.analytics?.approval_pending === 1, 'escalate.analytics', 'escalate clone flow lands in failed/manual-review state with urgent maintenance and pending approval still visible', out);
  assert(scenarios.lockConflict.after.operator.analytics?.lock_conflicts === 0, 'lock.analytics', 'lock conflict resolution clears conflict analytics', out);

  assert(scenarios.approval.after.clientTask.live_state === 'retry', 'approval.client_state', `approval client live_state=${scenarios.approval.after.clientTask.live_state}`, out);
  assert(scenarios.reject.after.clientTask.live_state === 'retry', 'reject.client_state', `reject client live_state=${scenarios.reject.after.clientTask.live_state}`, out);
  assert(scenarios.requeue.after.clientTask.live_state === 'queued', 'requeue.client_state', `requeue client live_state=${scenarios.requeue.after.clientTask.live_state}`, out);
  assert(scenarios.escalate.after.clientTask.live_state === 'failed', 'escalate.client_state', `escalate client live_state=${scenarios.escalate.after.clientTask.live_state}`, out);
  assert(scenarios.lockConflict.after.clientTask.live_state === 'retry', 'lock.client_state', `lock client live_state=${scenarios.lockConflict.after.clientTask.live_state}`, out);

  assert((scenarios.requeue.after.clientTask.timeline || []).some((event) => event.type === 'operator_action'), 'requeue.timeline.audit', 'requeue timeline exposes operator audit event', out);
  assert((scenarios.escalate.after.card.hints || []).some((hint) => hint.action === 'operator_review'), 'escalate.hints.updated', 'escalate scenario updates operator hints for manual review', out);
  assert((scenarios.lockConflict.after.card.actions || []).every((entry) => entry.action !== 'resolve_lock_conflict'), 'lock.action.removed', 'resolved lock conflict action disappears after fix', out);
  assert((scenarios.requeue.after.operator.analytics?.maintenance_digest?.top_pending || []).every((item) => item.type !== 'retry_followup'), 'requeue.maintenance.updated', 'requeue clears retry_followup maintenance item', out);

  assert(scenarios.approval.after.operator.client_payload.reconnect_safe === true && scenarios.approval.after.operator.client_payload.backfill_safe === true, 'snapshot.safe.flags', 'snapshot-safe flags remain true on clone reread', out);
  assert(scenarios.approval.after.operator.client_payload.updatedAt !== scenarios.approval.before.operator.client_payload.updatedAt, 'snapshot.safe.reread', 'isolated reread updates updatedAt', out);
  assert(server.includes("app.get('/api/export/operator-snapshot'") && server.includes('analytics: enriched.operator?.analytics'), 'export.wiring.present', 'export wiring remains present', out);
  assert(server.includes("app.get('/api/state'") && server.includes('actor_role: actorRole'), 'role.wiring.present', 'role-aware state wiring remains present', out);
  assert(uiJs.includes('startReadOnlyHydrateSocket') && uiJs.includes('read-only hydrate must never replace snapshot polling'), 'ws.readonly.present', 'websocket stays read-only enhancement', out);

  out.summary = {
    total_checks: out.checks.length,
    passed: out.checks.filter((item) => item.ok).length,
    failed: out.checks.filter((item) => !item.ok).length,
    scenarios: {
      approval: {
        result: scenarios.approval.executed.result.status,
        approval_state: scenarios.approval.executed.task.approval_state,
        client_live_state: scenarios.approval.after.clientTask.live_state,
      },
      reject: {
        result: scenarios.reject.executed.result.status,
        approval_state: scenarios.reject.executed.task.approval_state,
        client_live_state: scenarios.reject.after.clientTask.live_state,
      },
      requeue: {
        result: scenarios.requeue.executed.result.status,
        assignment_state: scenarios.requeue.executed.task.assignment_state,
        client_live_state: scenarios.requeue.after.clientTask.live_state,
      },
      escalate: {
        result: scenarios.escalate.executed.result.status,
        assignment_state: scenarios.escalate.executed.task.assignment_state,
        client_live_state: scenarios.escalate.after.clientTask.live_state,
      },
      lock_conflict: {
        result: scenarios.lockConflict.executed.result.status,
        lock_conflict: scenarios.lockConflict.executed.task.lock_conflict,
        client_live_state: scenarios.lockConflict.after.clientTask.live_state,
      },
    },
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}

run();
