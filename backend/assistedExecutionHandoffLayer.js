const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildOperatorSurface } = require('./operatorLayer');
const { buildRuntimeUiView } = require('./uiStateView');

function buildReadinessOutputs(tasks = [], actorRole = 'orchestrator') {
  const operator = buildOperatorSurface({ updatedAt: new Date().toISOString(), actorRole, tasks });
  return tasks.slice(0, 6).map((task) => {
    const card = operator.cards.find((item) => item.id === task.id) || {};
    return {
      task_id: task.id || null,
      live_state: card.live_state || null,
      review_ready: card.readiness?.review_ready || false,
      approval_state: card.approval_state || 'none',
      next_visible_actions: (card.actions || []).filter((item) => item.executable !== false).map((item) => item.action),
    };
  });
}

function buildSuggestedNextHandoff(tasks = [], actorRole = 'orchestrator') {
  const assistance = buildDecisionAssistanceSurface({ updatedAt: new Date().toISOString(), tasks }, actorRole);
  const top = assistance.routing_recommendations[0] || null;
  return {
    owner: top?.owner || assistance.planning_output?.suggested_owner || 'orchestrator',
    kind: top?.kind || 'normal_routing',
    reason: top?.reason || 'no_priority_shift',
    priority: top?.priority || 'low',
  };
}

function buildExecutionHandoffSummary(tasks = [], actorRole = 'orchestrator') {
  const assistance = buildDecisionAssistanceSurface({ updatedAt: new Date().toISOString(), tasks }, actorRole);
  const operator = buildOperatorSurface({ updatedAt: new Date().toISOString(), actorRole, tasks });
  return {
    suggested_owner: assistance.planning_output?.suggested_owner || 'orchestrator',
    routing_focus: assistance.planning_output?.routing_focus || 'normal_flow',
    top_operator_actions: assistance.compact_assistance_surface?.top_operator_actions || [],
    analytics_alignment: assistance.compact_assistance_surface?.analytics_alignment || {},
    visible_actions_total: operator.analytics?.visible_actions_total || 0,
  };
}

function buildNextActionGuidance(tasks = [], actorRole = 'orchestrator') {
  const assistance = buildDecisionAssistanceSurface({ updatedAt: new Date().toISOString(), tasks }, actorRole);
  return {
    guidance_mode: 'non_destructive',
    next_actions: assistance.routing_recommendations.map((item) => ({
      kind: item.kind,
      owner: item.owner,
      priority: item.priority,
      reason: item.reason,
      safe: true,
    })),
    planning_hints: assistance.planning_output?.hint_kinds || [],
  };
}

function buildAssistedExecutionHandoff(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const ui = buildRuntimeUiView({ updatedAt, tasks });
  const operator = buildOperatorSurface({ updatedAt, actorRole, tasks });
  const readiness = buildReadinessOutputs(tasks, actorRole);
  const handoff = buildSuggestedNextHandoff(tasks, actorRole);
  const summary = buildExecutionHandoffSummary(tasks, actorRole);
  const guidance = buildNextActionGuidance(tasks, actorRole);

  return {
    updatedAt,
    actor_role: actorRole,
    handoff_kind: 'assisted-execution-handoff',
    readiness_outputs: readiness,
    suggested_next_handoff: handoff,
    execution_handoff_summary: summary,
    next_action_guidance: guidance,
    compact_handoff_surface: {
      suggested_owner: handoff.owner,
      handoff_kind: handoff.kind,
      readiness_ready_total: readiness.filter((item) => item.review_ready).length,
      analytics_alignment: summary.analytics_alignment,
      role_aware: {
        actor_role: actorRole,
        visible_actions_total: operator.analytics?.visible_actions_total || 0,
        read_only_cards: operator.analytics?.read_only_cards || 0,
      },
      snapshot_safe: {
        reconnect_safe: ui.reconnect_safe === true && operator.client_payload?.reconnect_safe === true,
        backfill_safe: ui.backfill_safe === true && operator.client_payload?.backfill_safe === true,
      },
    },
  };
}

module.exports = {
  buildAssistedExecutionHandoff,
  buildReadinessOutputs,
  buildSuggestedNextHandoff,
  buildExecutionHandoffSummary,
  buildNextActionGuidance,
};
