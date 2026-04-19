const { buildExecutiveSummary } = require('./executiveSummaryLayer');
const { buildDecisionConsumerSurface } = require('./knowledgeAwareLayer');
const { buildOperatorSurface } = require('./operatorLayer');
const { buildRuntimeUiView } = require('./uiStateView');

function buildStakeholderHandoffBundle(runtimeState = {}, actorRole = 'cto') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const ui = buildRuntimeUiView({ updatedAt, tasks });
  const operator = buildOperatorSurface({ updatedAt, actorRole, tasks });
  const executive = buildExecutiveSummary({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionConsumerSurface({ updatedAt, tasks }, actorRole);
  const analytics = operator.analytics || {};
  const maintenance = analytics.maintenance_digest || {};

  return {
    updatedAt,
    actor_role: actorRole,
    bundle_kind: 'stakeholder-handoff',
    executive_summary: executive,
    decision_context_summary: {
      suggested_owner: decision.suggested_owner || 'orchestrator',
      decision_summary: decision.decision_summary || {},
      cto_orchestrator_brief: decision.cto_orchestrator_brief || {},
      compact_decision_payload: decision.compact_decision_payload || {},
    },
    reporting_export_summary: {
      analytics_summary: executive.analytics_summary || {},
      reporting_export_summary: executive.reporting_export_summary || {},
      operator_workflow_status_digest: executive.operator_workflow_status_digest || {},
    },
    operator_workflow_summary: {
      card_count: operator.cards.length,
      visible_actions_total: analytics.visible_actions_total || 0,
      approval_pending: analytics.approval_pending || 0,
      retry_total: analytics.retry_total || 0,
      escalated: analytics.escalated || 0,
      read_only_cards: analytics.read_only_cards || 0,
    },
    maintenance_anomaly_digest: {
      pending_total: maintenance.pending_total || 0,
      urgent_total: maintenance.urgent_total || 0,
      top_pending: maintenance.top_pending || [],
      anomaly_flags: executive.maintenance_anomaly_digest?.anomaly_flags || [],
    },
    clone_rehearsal_status: {
      runtime_tasks: ui.tasks.length,
      reconnect_safe: true,
      backfill_safe: true,
      by_live_state: analytics.by_live_state || {},
      export_ready: true,
    },
    handoff_payload: {
      actor_role: actorRole,
      total_tasks: executive.analytics_summary?.total_tasks || ui.tasks.length,
      suggested_owner: decision.suggested_owner || 'orchestrator',
      routing_focus: decision.decision_summary?.routing_focus || 'normal_flow',
      anomaly_flags: executive.maintenance_anomaly_digest?.anomaly_flags || [],
      top_recommendations: executive.operator_workflow_status_digest?.top_recommendations || [],
    },
  };
}

module.exports = {
  buildStakeholderHandoffBundle,
};
