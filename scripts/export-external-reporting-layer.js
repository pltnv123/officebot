const fs = require('fs');
const path = require('path');
const { buildOperatorSurface } = require('../backend/operatorLayer');
const { buildRuntimeUiView } = require('../backend/uiStateView');
const { executeOperatorAction } = require('../backend/operatorActions');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeBaseTask() {
  const oldTs = new Date(Date.now() - (45 * 60 * 1000)).toISOString();
  return {
    id: 'REPORT-OP-1',
    title: 'external reporting layer runtime clone',
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
      { type: 'execution_result', owner: 'backend', created_at: oldTs, payload: { owner: 'backend', result: 'retryable reporting issue' } },
    ],
    result: {
      summary: 'retryable reporting issue awaiting operator decision',
      artifact_status: 'ready',
      artifacts: [
        { id: 'report-artifact-1', kind: 'log', path: 'tmp/report-runtime.log', label: 'report-runtime.log', status: 'ready' },
      ],
    },
  };
}

function summarizeTask(task, actorRole = 'orchestrator', updatedAt = new Date().toISOString()) {
  const runtime = { updatedAt, actorRole, tasks: [clone(task)] };
  const operator = buildOperatorSurface(runtime);
  return {
    runtime: buildRuntimeUiView(runtime),
    operator,
    clientTask: operator.client_payload.tasks[0],
    card: operator.cards[0],
  };
}

function runScenario(baseTask, action) {
  const executed = executeOperatorAction(clone(baseTask), action, 'orchestrator');
  const after = summarizeTask(executed.task, 'orchestrator', '2026-04-19T11:56:00.000Z');
  return {
    action,
    result: executed.result.status,
    detail: executed.result.detail || {},
    client_live_state: after.clientTask.live_state,
    analytics: after.operator.analytics,
    export_summary: after.operator.analytics?.export_summary || {},
    top_pending: after.operator.analytics?.maintenance_digest?.top_pending || [],
    operator_summary: after.card?.audit_digest?.human_review_text || '',
  };
}

function buildReportingLayer() {
  const baseTask = makeBaseTask();
  const base = summarizeTask(baseTask, 'orchestrator', '2026-04-19T11:55:00.000Z');
  const qa = summarizeTask(baseTask, 'qa', '2026-04-19T11:55:30.000Z');
  const cloneReportPath = path.join(__dirname, '..', 'docs', 'artifacts', 'operator-clone-acceptance-report.json');
  const cloneReport = fs.existsSync(cloneReportPath) ? JSON.parse(fs.readFileSync(cloneReportPath, 'utf8')) : null;

  const scenarios = {
    approval: runScenario(baseTask, 'approve_task'),
    reject: runScenario(baseTask, 'reject_task'),
    requeue: runScenario(baseTask, 'requeue_task'),
    escalate: runScenario(baseTask, 'escalate_task'),
    lock_conflict_resolution: runScenario(baseTask, 'resolve_lock_conflict'),
  };

  return {
    generatedAt: new Date().toISOString(),
    kind: 'external-reporting-layer',
    source: 'read-only-export-generator',
    runtime_summary: {
      tasks: base.runtime.tasks.length,
      live_state: base.clientTask.live_state,
      reconnect_safe: base.operator.client_payload.reconnect_safe,
      backfill_safe: base.operator.client_payload.backfill_safe,
    },
    operator_summary: {
      card_count: base.operator.cards.length,
      top_recommendations: (base.card?.top_recommendations || []).map((item) => item.label || item.action),
      human_review_text: base.card?.audit_digest?.human_review_text || '',
      qa_view_only_actions: (qa.card?.actions || []).filter((item) => item.executable === false).map((item) => item.action),
    },
    approvals_retries_escalations: {
      approval_pending: base.operator.analytics?.approval_pending || 0,
      retry_total: base.operator.analytics?.retry_total || 0,
      escalated: base.operator.analytics?.escalated || 0,
      by_live_state: base.operator.analytics?.by_live_state || {},
    },
    maintenance_summary: {
      pending_total: base.operator.analytics?.maintenance_digest?.pending_total || 0,
      urgent_total: base.operator.analytics?.maintenance_digest?.urgent_total || 0,
      by_type: base.operator.analytics?.maintenance_routine_counts?.by_type || {},
      top_pending: base.operator.analytics?.maintenance_digest?.top_pending || [],
    },
    clone_rehearsal_summary: {
      report_present: Boolean(cloneReport),
      scenarios: cloneReport?.scenarios ? Object.keys(cloneReport.scenarios) : Object.keys(scenarios),
      scenario_outcomes: Object.fromEntries(Object.entries(scenarios).map(([key, value]) => [key, {
        result: value.result,
        client_live_state: value.client_live_state,
      }])),
    },
    export_friendly: {
      runtime_summary: {
        tasks: base.runtime.tasks.length,
        live_state: base.clientTask.live_state,
      },
      operator_summary: {
        card_count: base.operator.cards.length,
        qa_view_only_actions: (qa.card?.actions || []).filter((item) => item.executable === false).map((item) => item.action),
      },
      approvals_retries_escalations: {
        approval_pending: base.operator.analytics?.approval_pending || 0,
        retry_total: base.operator.analytics?.retry_total || 0,
        escalated: base.operator.analytics?.escalated || 0,
      },
      maintenance_summary: {
        pending_total: base.operator.analytics?.maintenance_digest?.pending_total || 0,
        urgent_total: base.operator.analytics?.maintenance_digest?.urgent_total || 0,
      },
      clone_rehearsal_summary: Object.fromEntries(Object.entries(scenarios).map(([key, value]) => [key, value.client_live_state])),
    },
  };
}

const report = buildReportingLayer();
const outPath = path.join(__dirname, '..', 'docs', 'artifacts', 'external-reporting-layer.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, outPath, sections: Object.keys(report) }, null, 2));
