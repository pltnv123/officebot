const { buildKnowledgeAwareContext, buildDecisionConsumerSurface } = require('./knowledgeAwareLayer');
const { buildOperatorSurface } = require('./operatorLayer');
const { buildRuntimeUiView } = require('./uiStateView');

function rankRoutingRecommendations(tasks = [], actorRole = 'orchestrator') {
  const knowledge = buildKnowledgeAwareContext({ updatedAt: new Date().toISOString(), tasks }, actorRole, { includeDecisionConsumer: false });
  const decision = buildDecisionConsumerSurface({ updatedAt: new Date().toISOString(), tasks }, actorRole);
  const recommendations = [];

  if (knowledge.routing_summary.approval_pending > 0) {
    recommendations.push({ kind: 'approval_review', priority: 'high', owner: decision.suggested_owner, reason: 'approval_pending_tasks_present' });
  }
  if (knowledge.routing_summary.escalated > 0) {
    recommendations.push({ kind: 'escalation_review', priority: 'high', owner: 'cto', reason: 'escalated_tasks_present' });
  }
  if (knowledge.routing_summary.retry_queue > 0) {
    recommendations.push({ kind: 'retry_retrieval', priority: 'medium', owner: 'orchestrator', reason: 'retry_queue_present' });
  }
  if (knowledge.routing_summary.pending_review === 0) {
    recommendations.push({ kind: 'normal_routing', priority: 'low', owner: 'orchestrator', reason: 'no_pending_review_pressure' });
  }

  return recommendations;
}

function buildOperatorDecisionHints(tasks = [], actorRole = 'orchestrator') {
  const operator = buildOperatorSurface({ updatedAt: new Date().toISOString(), actorRole, tasks });
  const analytics = operator.analytics || {};
  return {
    approval_attention: analytics.approval_pending || 0,
    retry_attention: analytics.retry_total || 0,
    escalation_attention: analytics.escalated || 0,
    maintenance_attention: analytics.maintenance_digest?.pending_total || 0,
    top_recommendations: operator.cards.flatMap((card) => (card.top_recommendations || []).map((item) => ({
      task_id: card.id,
      action: item.action,
      label: item.label,
      group: item.group,
    }))).slice(0, 6),
  };
}

function buildPlanningOutput(tasks = [], actorRole = 'orchestrator') {
  const knowledge = buildKnowledgeAwareContext({ updatedAt: new Date().toISOString(), tasks }, actorRole);
  const decision = knowledge.decision_consumer || buildDecisionConsumerSurface({ updatedAt: new Date().toISOString(), tasks }, actorRole);
  return {
    suggested_owner: decision.suggested_owner,
    routing_focus: decision.decision_summary?.routing_focus || 'normal_flow',
    hint_kinds: decision.compact_decision_payload?.hint_kinds || [],
    top_memory_queries: decision.cto_orchestrator_brief?.top_memory_queries || [],
    top_retrieval_queries: decision.cto_orchestrator_brief?.top_retrieval_queries || [],
  };
}

function buildDecisionAssistanceSurface(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const ui = buildRuntimeUiView({ updatedAt, tasks });
  const operator = buildOperatorSurface({ updatedAt, actorRole, tasks });
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole);
  const decision = knowledge.decision_consumer || buildDecisionConsumerSurface({ updatedAt, tasks }, actorRole);
  const routingRecommendations = rankRoutingRecommendations(tasks, actorRole);
  const operatorHints = buildOperatorDecisionHints(tasks, actorRole);
  const planningOutput = buildPlanningOutput(tasks, actorRole);

  return {
    updatedAt,
    actor_role: actorRole,
    assistance_kind: 'decision-assisted-workflows',
    routing_recommendations: routingRecommendations,
    operator_decision_hints: operatorHints,
    planning_output: planningOutput,
    compact_assistance_surface: {
      suggested_owner: planningOutput.suggested_owner,
      routing_focus: planningOutput.routing_focus,
      routing_recommendation_kinds: routingRecommendations.map((item) => item.kind),
      top_operator_actions: operatorHints.top_recommendations.map((item) => item.action).filter(Boolean),
      analytics_alignment: {
        approval_pending: operator.analytics?.approval_pending || 0,
        retry_total: operator.analytics?.retry_total || 0,
        escalated: operator.analytics?.escalated || 0,
      },
      snapshot_safe: {
        reconnect_safe: ui.reconnect_safe === true && operator.client_payload?.reconnect_safe === true,
        backfill_safe: ui.backfill_safe === true && operator.client_payload?.backfill_safe === true,
      },
    },
  };
}

module.exports = {
  buildDecisionAssistanceSurface,
  rankRoutingRecommendations,
  buildOperatorDecisionHints,
  buildPlanningOutput,
};
