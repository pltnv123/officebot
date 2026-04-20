const { buildAssistedExecutionDispatchCoordinationLayer } = require('./assistedExecutionDispatchCoordinationLayer');
const { buildAssistedExecutionDispatchReadinessLayer } = require('./assistedExecutionDispatchReadinessLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildPreflightChecks(coordination = {}, readiness = {}) {
  const goNoGo = readiness.dispatch_go_no_go_summary?.status || 'go';
  const blockers = readiness.handoff_blockers || [];
  return [
    {
      check: 'dispatch_readiness_gate',
      status: goNoGo === 'go' ? 'pass' : 'fail',
      detail: goNoGo === 'go' ? 'dispatch gate is green' : 'dispatch gate reports blockers',
    },
    {
      check: 'coordination_blockers',
      status: (coordination.coordination_blockers || []).length === 0 ? 'pass' : 'fail',
      detail: `${(coordination.coordination_blockers || []).length} coordination blockers`,
    },
    {
      check: 'handoff_blockers',
      status: blockers.length === 0 ? 'pass' : 'fail',
      detail: `${blockers.length} handoff blockers`,
    },
  ];
}

function buildOrchestrationRiskFlags(coordination = {}, readiness = {}, decision = {}, knowledge = {}) {
  const flags = [];
  if ((coordination.coordination_blockers || []).length > 0) flags.push('coordination_blockers_present');
  if ((readiness.handoff_blockers || []).length > 0) flags.push('handoff_blockers_present');
  if ((readiness.lane_saturation_signals || []).some((item) => item.saturated)) flags.push('lane_saturation_detected');
  if ((decision.routing_recommendations || []).some((item) => item.priority === 'high')) flags.push('high_priority_dispatch_attention');
  if ((knowledge.routing_summary?.escalated || 0) > 0) flags.push('escalated_tasks_present');
  return flags;
}

function buildDependencyReadinessMatrix(coordination = {}, readiness = {}) {
  const dependencies = coordination.dispatch_dependencies || [];
  return dependencies.map((item) => ({
    task_id: item.task_id,
    dependency_groups: item.depends_on,
    ready: !(readiness.assignment_readiness_checks || []).find((check) => check.task_id === item.task_id && check.ready === false),
    blocked_by: (readiness.assignment_readiness_checks || []).find((check) => check.task_id === item.task_id)?.blockers || [],
  }));
}

function buildDispatchStartRecommendation(checks = [], riskFlags = [], coordination = {}, readiness = {}) {
  const failed = checks.filter((item) => item.status === 'fail').length;
  return {
    status: failed > 0 || riskFlags.length > 0 ? 'hold' : 'start_ready',
    reason: failed > 0 ? 'preflight_checks_failed' : (riskFlags.length > 0 ? 'risk_flags_present' : 'preflight_green'),
    go_no_go: readiness.dispatch_go_no_go_summary?.status || coordination.cross_lane_coordination_summary?.go_no_go || 'go',
    suggested_owner: coordination.coordination_payload?.suggested_owner || 'orchestrator',
  };
}

function buildPreflightSummary(checks = [], riskFlags = [], matrix = []) {
  return {
    total_checks: checks.length,
    failed_checks: checks.filter((item) => item.status === 'fail').length,
    risk_flag_total: riskFlags.length,
    ready_dependencies: matrix.filter((item) => item.ready).length,
    blocked_dependencies: matrix.filter((item) => !item.ready).length,
  };
}

function buildAssistedExecutionDispatchOrchestrationPreflightLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const coordination = buildAssistedExecutionDispatchCoordinationLayer({ updatedAt, tasks }, actorRole);
  const readiness = buildAssistedExecutionDispatchReadinessLayer({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionAssistanceSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const preflightChecks = buildPreflightChecks(coordination, readiness);
  const riskFlags = buildOrchestrationRiskFlags(coordination, readiness, decision, knowledge);
  const dependencyMatrix = buildDependencyReadinessMatrix(coordination, readiness);
  const startRecommendation = buildDispatchStartRecommendation(preflightChecks, riskFlags, coordination, readiness);
  const preflightSummary = buildPreflightSummary(preflightChecks, riskFlags, dependencyMatrix);

  return {
    updatedAt,
    actor_role: actorRole,
    preflight_kind: 'assisted-execution-dispatch-orchestration-preflight',
    preflight_checks: preflightChecks,
    orchestration_risk_flags: riskFlags,
    dependency_readiness_matrix: dependencyMatrix,
    dispatch_start_recommendation: startRecommendation,
    preflight_summary: preflightSummary,
    preflight_payload: {
      actor_role: actorRole,
      go_no_go: startRecommendation.go_no_go,
      recommendation: startRecommendation.status,
      read_only: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionDispatchOrchestrationPreflightLayer,
  buildPreflightChecks,
  buildOrchestrationRiskFlags,
  buildDependencyReadinessMatrix,
  buildDispatchStartRecommendation,
  buildPreflightSummary,
};
