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

function makeTask() {
  const oldTs = new Date(Date.now() - (20 * 60 * 1000)).toISOString();
  return {
    id: 'RDY-1',
    title: 'role-aware operator readiness task',
    status: 'doing',
    assignment_state: 'retry',
    approval_state: 'approval_pending',
    lock_conflict: true,
    created_at: oldTs,
    started_at: oldTs,
    updatedAt: oldTs,
    events: [
      { type: 'assigned', owner: 'orchestrator', created_at: oldTs, payload: { owner: 'orchestrator' } },
      { type: 'execution_result', owner: 'backend', created_at: oldTs, payload: { owner: 'backend', result: 'retryable issue' } },
    ],
    result: {
      summary: 'retryable issue',
      artifact_status: 'ready',
      artifacts: [{ id: 'rdy-art-1', path: 'tmp/rdy.log', label: 'rdy.log', status: 'ready' }],
    },
  };
}

function run() {
  const out = { ok: true, checks: [], summary: {} };
  const server = fs.readFileSync(path.join(__dirname, '..', 'backend', 'server.js'), 'utf8');
  const uiJs = fs.readFileSync(path.join(__dirname, 'tasks-ui.js'), 'utf8');

  const task = makeTask();
  const runtimeOrchestrator = { updatedAt: '2026-04-19T11:10:00.000Z', actorRole: 'orchestrator', tasks: [clone(task)] };
  const runtimeQa = { updatedAt: '2026-04-19T11:11:00.000Z', actorRole: 'qa', tasks: [clone(task)] };

  const surfaceOrchestrator = buildOperatorSurface(runtimeOrchestrator);
  const surfaceQa = buildOperatorSurface(runtimeQa);
  const qaCard = surfaceQa.cards[0];
  const orchCard = surfaceOrchestrator.cards[0];

  assert((orchCard.actions || []).some((item) => item.action === 'approve_task' && item.executable === true), 'role.orchestrator.executable', 'orchestrator sees executable approval action', out);
  assert((qaCard.actions || []).some((item) => item.action === 'requeue_task' && item.executable === false), 'role.qa.view_only', 'qa sees role-aware view-only requeue action', out);
  assert((surfaceQa.analytics?.operator_action_digest?.view_only_actions || 0) >= 1, 'analytics.view_only.digest', 'analytics counts view-only actions for read-only role', out);

  const after = executeOperatorAction(clone(task), 'requeue_task', 'orchestrator').task;
  const runtimeAfter = { updatedAt: '2026-04-19T11:12:00.000Z', actorRole: 'orchestrator', tasks: [clone(after)] };
  const uiAfter = buildRuntimeUiView(runtimeAfter);
  const surfaceAfter = buildOperatorSurface(runtimeAfter);

  assert(uiAfter.tasks[0]?.live_state === 'queued', 'client.queued.after_requeue', `live_state=${uiAfter.tasks[0]?.live_state}`, out);
  assert(surfaceAfter.analytics?.export_summary?.by_live_state?.queued === 1, 'export.queued.aligned', 'export summary aligned with queued client state', out);
  assert((surfaceAfter.analytics?.maintenance_digest?.top_pending || []).every((item) => item.type !== 'retry_followup'), 'analytics.retry_followup.cleared', 'analytics cleared retry followup after requeue', out);
  assert(surfaceAfter.client_payload.reconnect_safe === true && surfaceAfter.client_payload.backfill_safe === true, 'snapshot.safe.flags', 'snapshot-safe flags preserved after reread', out);
  assert(surfaceAfter.client_payload.updatedAt !== surfaceOrchestrator.client_payload.updatedAt, 'snapshot.reread.updatedAt', 'updatedAt changes across reread snapshots', out);

  assert(server.includes("app.get('/api/export/operator-snapshot'") && server.includes('analytics: enriched.operator?.analytics'), 'server.export.surface', 'export surface wiring remains present', out);
  assert(server.includes("app.get('/api/state'") && server.includes('actor_role: actorRole'), 'server.role.aware.state', 'api/state remains role-aware', out);
  assert(uiJs.includes('startReadOnlyHydrateSocket') && uiJs.includes('read-only hydrate must never replace snapshot polling'), 'ui.ws.read_only', 'websocket hydrate remains read-only enhancement', out);
  assert(uiJs.includes("'X-Actor-Role': actorRole"), 'ui.role.header', 'client surface still propagates actor role header', out);

  out.summary = {
    total_checks: out.checks.length,
    passed: out.checks.filter((item) => item.ok).length,
    failed: out.checks.filter((item) => !item.ok).length,
    queued_after_requeue: uiAfter.tasks[0]?.live_state,
    qa_view_only_actions: surfaceQa.analytics?.operator_action_digest?.view_only_actions || 0,
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}

run();
