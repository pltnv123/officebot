const { buildAssistedExecutionDispatchReadinessLayer } = require('./assistedExecutionDispatchReadinessLayer');
const { buildAssistedExecutionDispatchLayer } = require('./assistedExecutionDispatchLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildCrossLaneCoordinationSummary(readiness = {}, dispatch = {}) {
  const saturated = readiness.lane_saturation_signals?.filter((item) => item.saturated) || [];
  return {
    total_lanes: Object.keys(dispatch.dispatch_lanes?.by_role || {}).length,
    saturated_lanes: saturated.map((item) => item.lane),
    blocker_total: readiness.handoff_blockers?.length || 0,
    go_no_go: readiness.dispatch_go_no_go_summary?.status || 'go',
  };
}

function buildDispatchDependencies(tasks = [], dispatch = {}, knowledge = {}) {
  return tasks.slice(0, 8).map((task) => ({
    task_id: task.id || null,
    depends_on: [
      String(task.approval_state || '').toLowerCase() === 'approval_pending' ? 'approval_review' : '',
      String(task.assignment_state || '').toLowerCase() === 'escalated' ? 'cto_review' : '',
      knowledge.memory_aware_tasks?.find((item) => item.task_id === task.id)?.retrieval_queries?.[0] ? 'retrieval_context' : '',
    ].filter(Boolean),
    suggested_target: dispatch.dispatch_recommendations?.find((item) => item.task_id === task.id)?.suggested_target || 'ORCHESTRATOR',
  }));
}

function buildCoordinationBlockers(readiness = {}, decision = {}) {
  const blockers = [...(readiness.handoff_blockers || [])];
  if ((decision.routing_recommendations || []).some((item) => item.priority === 'high')) {
    blockers.push({
      task_id: null,
      blocker_type: 'high_priority_review_attention',
      action: 'review_priority_queue',
      level: 'high',
    });
  }
  return blockers.slice(0, 10);
}

function buildCoordinatedDispatchPlan(dispatch = {}, readiness = {}, dependencies = []) {
  return (dispatch.execution_priority_queue || []).slice(0, 8).map((item) => ({
    rank: item.rank,
    task_id: item.task_id,
    target: item.suggested_target,
    urgency: item.urgency,
    blocked: (readiness.assignment_readiness_checks || []).find((check) => check.task_id === item.task_id && check.ready === false)?.blockers || [],
    dependencies: dependencies.find((dep) => dep.task_id === item.task_id)?.depends_on || [],
  }));
}

function buildAssistedExecutionDispatchCoordinationLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const readiness = buildAssistedExecutionDispatchReadinessLayer({ updatedAt, tasks }, actorRole);
  const dispatch = buildAssistedExecutionDispatchLayer({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionAssistanceSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const dependencies = buildDispatchDependencies(tasks, dispatch, knowledge);

  return {
    updatedAt,
    actor_role: actorRole,
    coordination_kind: 'assisted-execution-dispatch-coordination-pack',
    cross_lane_coordination_summary: buildCrossLaneCoordinationSummary(readiness, dispatch),
    dispatch_dependencies: dependencies,
    coordination_blockers: buildCoordinationBlockers(readiness, decision),
    coordinated_dispatch_plan: buildCoordinatedDispatchPlan(dispatch, readiness, dependencies),
    coordination_payload: {
      actor_role: actorRole,
      suggested_owner: dispatch.dispatch_payload?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
      go_no_go: readiness.dispatch_go_no_go_summary?.status || 'go',
      read_only: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionDispatchCoordinationLayer,
  buildCrossLaneCoordinationSummary,
  buildDispatchDependencies,
  buildCoordinationBlockers,
  buildCoordinatedDispatchPlan,
};
