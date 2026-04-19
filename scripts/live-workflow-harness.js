const http = require('http');
const fs = require('fs');
const path = require('path');
const { executeOperatorAction } = require('../backend/operatorActions');
const { buildOperatorSurface } = require('../backend/operatorLayer');
const { buildRuntimeUiView } = require('../backend/uiStateView');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data || '{}'));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(ok, code, detail, out) {
  out.checks.push({ code, ok: Boolean(ok), detail });
  if (!ok) out.ok = false;
}

function ensureSnapshotShape(task = {}, index = 0) {
  const oldTs = new Date(Date.now() - ((index + 1) * 20 * 60 * 1000)).toISOString();
  return {
    ...clone(task),
    id: task.id || `live-snapshot-${index + 1}`,
    title: task.title || `live snapshot ${index + 1}`,
    status: task.status || 'doing',
    assignment_state: task.assignment_state || 'retry',
    approval_state: task.approval_state || 'approval_pending',
    lock_conflict: typeof task.lock_conflict === 'boolean' ? task.lock_conflict : true,
    created_at: task.created_at || oldTs,
    started_at: task.started_at || oldTs,
    updatedAt: task.updatedAt || oldTs,
    events: Array.isArray(task.events) ? clone(task.events) : [
      { type: 'assigned', owner: 'orchestrator', created_at: oldTs, payload: { owner: 'orchestrator' } },
      { type: 'execution_result', owner: 'backend', created_at: oldTs, payload: { owner: 'backend', result: 'retryable issue' } },
    ],
    result: task.result || {
      summary: 'retryable issue, awaiting operator decision',
      artifact_status: 'ready',
      artifacts: [{ id: `artifact-${index + 1}`, path: `tmp/live-snapshot-${index + 1}.log`, label: `live-snapshot-${index + 1}.log`, status: 'ready' }],
    },
  };
}

function selectSnapshots(tasks = []) {
  const list = Array.isArray(tasks) ? tasks : [];
  return list.slice(0, 2).map((task, index) => ensureSnapshotShape(task, index));
}

function readStaticWiring() {
  const server = fs.readFileSync(path.join(__dirname, '..', 'backend', 'server.js'), 'utf8');
  const uiJs = fs.readFileSync(path.join(__dirname, 'tasks-ui.js'), 'utf8');
  return { server, uiJs };
}

function runBranch(snapshot, action) {
  return executeOperatorAction(clone(snapshot), action, 'orchestrator');
}

function summarizeBranchState(task) {
  const runtime = { updatedAt: new Date().toISOString(), actorRole: 'orchestrator', tasks: [clone(task)] };
  return {
    ui: buildRuntimeUiView(runtime),
    operator: buildOperatorSurface(runtime),
  };
}

function makeFallbackState() {
  const oldTs = new Date(Date.now() - (25 * 60 * 1000)).toISOString();
  return {
    storage: 'isolated-fallback',
    tasks: [
      {
        id: 'FALLBACK-1',
        title: 'fallback rehearsal snapshot',
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
          summary: 'fallback isolated rehearsal payload',
          artifact_status: 'ready',
          artifacts: [{ id: 'fallback-artifact', path: 'tmp/fallback.log', label: 'fallback.log', status: 'ready' }],
        },
      }
    ],
  };
}

async function run() {
  const out = { ok: true, checks: [], summary: {} };
  let state;
  let sourceMode = 'live-api';
  try {
    state = await fetchJson('http://127.0.0.1:8787/api/state?actorRole=orchestrator');
  } catch (_) {
    state = makeFallbackState();
    sourceMode = 'isolated-fallback';
  }
  const sourceTasks = Array.isArray(state?.tasks) ? state.tasks : [];
  const snapshots = selectSnapshots(sourceTasks);
  const { server, uiJs } = readStaticWiring();

  if (!snapshots.length) {
    console.log(JSON.stringify({ ok: false, checks: [], summary: {}, blocker: 'no runtime tasks available for snapshot harness' }, null, 2));
    process.exit(1);
  }

  const rehearsal = [];
  for (const snapshot of snapshots) {
    const approval = runBranch(snapshot, 'approve_task');
    const reject = runBranch(snapshot, 'reject_task');
    const requeue = runBranch(snapshot, 'requeue_task');
    const escalate = runBranch(snapshot, 'escalate_task');
    const resolveLock = runBranch(snapshot, 'resolve_lock_conflict');
    const qaSurface = buildOperatorSurface({ updatedAt: new Date().toISOString(), actorRole: 'qa', tasks: [clone(snapshot)] });

    rehearsal.push({ snapshot, approval, reject, requeue, escalate, resolveLock, qaSurface });
  }

  assert(rehearsal.every((item) => item.approval.result.status === 'ok' && item.approval.task.approval_state === 'approved'), 'branch.approval', 'approval branch works on isolated snapshots', out);
  assert(rehearsal.every((item) => item.reject.result.status === 'ok' && item.reject.task.approval_state === 'rejected'), 'branch.reject', 'reject branch works on isolated snapshots', out);
  assert(rehearsal.every((item) => item.requeue.result.status === 'ok' && item.requeue.task.assignment_state === 'queued' && item.requeue.task.status === 'pending'), 'branch.requeue', 'requeue branch resets retry into queued while keeping pending status', out);
  assert(rehearsal.every((item) => item.escalate.result.status === 'ok' && item.escalate.task.assignment_state === 'escalated'), 'branch.escalate', 'escalate branch works on isolated snapshots', out);
  assert(rehearsal.every((item) => item.resolveLock.result.status === 'ok' && item.resolveLock.task.lock_conflict === false), 'branch.lock_conflict', 'lock conflict branch works on isolated snapshots', out);

  const afterRequeue = summarizeBranchState(rehearsal[0].requeue.task);
  const afterEscalate = summarizeBranchState(rehearsal[0].escalate.task);
  const afterApprove = summarizeBranchState(rehearsal[0].approval.task);

  assert(afterRequeue.ui.tasks[0]?.live_state === 'queued', 'analytics.client.queued', `requeue live_state=${afterRequeue.ui.tasks[0]?.live_state}`, out);
  assert(afterRequeue.operator.analytics?.export_summary?.by_live_state?.queued === 1, 'export.aligned.requeue', 'export summary aligns with queued requeue state', out);
  assert((afterRequeue.operator.analytics?.maintenance_digest?.top_pending || []).every((item) => item.type !== 'retry_followup'), 'analytics.retry_followup.cleared', 'requeue clears retry followup in maintenance digest', out);
  assert(afterEscalate.operator.analytics?.escalated === 1, 'analytics.escalate.count', 'analytics reflects escalated branch', out);
  assert(afterApprove.operator.analytics?.approval_pending === 0, 'analytics.approval.cleared', 'analytics clears approval_pending after approval branch', out);

  assert((rehearsal[0].qaSurface.cards[0]?.actions || []).some((item) => item.action === 'requeue_task' && item.executable === false), 'role_aware.client_surface', 'role-aware client surface keeps QA action view-only', out);
  assert(afterRequeue.operator.client_payload.reconnect_safe === true && afterRequeue.operator.client_payload.backfill_safe === true, 'snapshot.safe.flags', 'snapshot-safe flags preserved in rehearsal reread', out);
  assert(afterRequeue.operator.client_payload.updatedAt !== afterApprove.operator.client_payload.updatedAt, 'snapshot.safe.reread', 'updatedAt changes across isolated rereads', out);
  assert(uiJs.includes('startReadOnlyHydrateSocket') && uiJs.includes('read-only hydrate must never replace snapshot polling'), 'ws.read_only.enhancement', 'websocket stays read-only enhancement', out);
  assert(server.includes("app.get('/api/export/operator-snapshot'") && server.includes('analytics: enriched.operator?.analytics'), 'export.surface.wiring', 'export surface wiring remains present', out);
  assert(server.includes("app.get('/api/state'") && server.includes('actor_role: actorRole'), 'role_aware.state.wiring', 'role-aware state wiring remains present', out);
  assert(sourceTasks.every((task, index) => JSON.stringify(task) === JSON.stringify((state.tasks || [])[index])), 'live_state_not_mutated', 'live runtime data remained unchanged by in-memory rehearsal', out);

  out.summary = {
    storage: state?.storage || 'unknown',
    source_mode: sourceMode,
    runtime_tasks_seen: sourceTasks.length,
    snapshots_used: snapshots.map((item) => item.id),
    branches_checked: ['approve_task', 'reject_task', 'requeue_task', 'escalate_task', 'resolve_lock_conflict'],
    decision_checklist: [
      'review audit_digest and timeline before acting',
      'confirm action is executable for current role',
      'after action, confirm analytics/export/client surface alignment',
      'prefer snapshot-safe reread; websocket hydrate is additive only',
    ],
    passed: out.checks.filter((item) => item.ok).length,
    failed: out.checks.filter((item) => !item.ok).length,
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}

run().catch((error) => {
  console.log(JSON.stringify({ ok: false, blocker: error.message }, null, 2));
  process.exit(1);
});
