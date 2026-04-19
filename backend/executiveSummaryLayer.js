const { buildOperatorSurface } = require('./operatorLayer');
const { buildRuntimeUiView } = require('./uiStateView');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildExecutiveSummary(runtimeState = {}, actorRole = 'cto') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const ui = buildRuntimeUiView({ updatedAt, tasks });
  const operator = buildOperatorSurface({ updatedAt, actorRole, tasks });
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole);
  const analytics = operator.analytics || {};
  const exportSummary = analytics.export_summary || {};
  const maintenanceDigest = analytics.maintenance_digest || {};
  const decision = knowledge.decision_consumer || {};

  return {
    updatedAt,
    actor_role: actorRole,
    summary_kind: 'executive-summary',
    analytics_summary: {
      total_tasks: analytics.total || ui.tasks.length,
      by_live_state: analytics.by_live_state || {},
      approval_pending: analytics.approval_pending || 0,
      retry_total: analytics.retry_total || 0,
      escalated: analytics.escalated || 0,
    },
    reporting_export_summary: {
      by_live_state: exportSummary.by_live_state || {},
      approvals: exportSummary.approvals || 0,
      retries: exportSummary.retries || 0,
      escalations: exportSummary.escalations || 0,
      stale: exportSummary.stale || 0,
      conflicts: exportSummary.conflicts || 0,
      read_only_cards: exportSummary.read_only_cards || 0,
    },
    decision_context_summary: {
      suggested_owner: decision.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
      routing_focus: decision.decision_summary?.routing_focus || 'normal_flow',
      hint_kinds: Array.isArray(decision.compact_decision_payload?.hint_kinds) ? decision.compact_decision_payload.hint_kinds : [],
      brief: decision.cto_orchestrator_brief?.headline || '',
    },
    maintenance_anomaly_digest: {
      pending_total: maintenanceDigest.pending_total || 0,
      urgent_total: maintenanceDigest.urgent_total || 0,
      top_pending: maintenanceDigest.top_pending || [],
      anomaly_flags: [
        (maintenanceDigest.urgent_total || 0) > 0 ? 'urgent_maintenance' : '',
        (analytics.lock_conflicts || 0) > 0 ? 'lock_conflicts' : '',
        (analytics.stuck_total || 0) > 0 ? 'stale_runtime' : '',
      ].filter(Boolean),
    },
    operator_workflow_status_digest: {
      card_count: operator.cards.length,
      visible_actions_total: analytics.visible_actions_total || 0,
      read_only_cards: analytics.read_only_cards || 0,
      top_recommendations: operator.cards.flatMap((card) => (card.top_recommendations || []).map((item) => item.label || item.action)).slice(0, 5),
    },
    executive_payload: {
      actor_role: actorRole,
      total_tasks: analytics.total || ui.tasks.length,
      suggested_owner: decision.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
      routing_focus: decision.decision_summary?.routing_focus || 'normal_flow',
      urgent_total: maintenanceDigest.urgent_total || 0,
      anomaly_flags: [
        (maintenanceDigest.urgent_total || 0) > 0 ? 'urgent_maintenance' : '',
        (analytics.lock_conflicts || 0) > 0 ? 'lock_conflicts' : '',
        (analytics.stuck_total || 0) > 0 ? 'stale_runtime' : '',
      ].filter(Boolean),
    },
  };
}

module.exports = {
  buildExecutiveSummary,
};
