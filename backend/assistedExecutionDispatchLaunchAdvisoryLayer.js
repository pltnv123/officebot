const { buildAssistedExecutionDispatchOrchestrationPreflightLayer } = require('./assistedExecutionDispatchOrchestrationPreflightLayer');
const { buildAssistedExecutionDispatchCoordinationLayer } = require('./assistedExecutionDispatchCoordinationLayer');
const { buildAssistedExecutionDispatchReadinessLayer } = require('./assistedExecutionDispatchReadinessLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildLaunchAdvisories(preflight = {}, coordination = {}, readiness = {}) {
  const advisories = [];
  const recommendation = preflight.dispatch_start_recommendation?.status || 'hold';
  advisories.push({
    kind: 'dispatch_activation_posture',
    severity: recommendation === 'start_ready' ? 'info' : 'warning',
    message: recommendation === 'start_ready'
      ? 'Dispatch activation posture is ready for controlled start.'
      : 'Dispatch activation should remain on hold until blockers are cleared.',
  });
  if ((coordination.coordination_blockers || []).length > 0) {
    advisories.push({
      kind: 'coordination_attention',
      severity: 'warning',
      message: `${coordination.coordination_blockers.length} coordination blockers require review before launch.`,
    });
  }
  if ((readiness.handoff_blockers || []).length > 0) {
    advisories.push({
      kind: 'handoff_attention',
      severity: 'warning',
      message: `${readiness.handoff_blockers.length} handoff blockers are still present.`,
    });
  }
  return advisories;
}

function buildStartWindowSignals(preflight = {}, readiness = {}, knowledge = {}) {
  return {
    go_no_go: preflight.dispatch_start_recommendation?.go_no_go || 'go',
    blocked_dependencies: preflight.preflight_summary?.blocked_dependencies || 0,
    saturated_lanes: readiness.dispatch_go_no_go_summary?.saturated_lanes || [],
    escalation_pressure: knowledge.routing_summary?.escalated || 0,
  };
}

function buildOrchestrationHoldReasons(preflight = {}, coordination = {}) {
  const reasons = [];
  if (preflight.dispatch_start_recommendation?.status === 'hold') reasons.push(preflight.dispatch_start_recommendation.reason || 'preflight_hold');
  for (const flag of preflight.orchestration_risk_flags || []) reasons.push(flag);
  for (const blocker of coordination.coordination_blockers || []) reasons.push(blocker.blocker_type || 'coordination_blocker');
  return Array.from(new Set(reasons)).slice(0, 10);
}

function buildDispatchActivationPosture(preflight = {}, advisories = [], startSignals = {}) {
  return {
    posture: preflight.dispatch_start_recommendation?.status === 'start_ready' ? 'controlled_start' : 'hold_and_review',
    explainable: true,
    advisory_count: advisories.length,
    go_no_go: startSignals.go_no_go || 'go',
  };
}

function buildAdvisorySummary(advisories = [], holdReasons = [], posture = {}) {
  return {
    advisory_total: advisories.length,
    hold_reason_total: holdReasons.length,
    posture: posture.posture || 'hold_and_review',
    explainable: posture.explainable === true,
  };
}

function buildAssistedExecutionDispatchLaunchAdvisoryLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const preflight = buildAssistedExecutionDispatchOrchestrationPreflightLayer({ updatedAt, tasks }, actorRole);
  const coordination = buildAssistedExecutionDispatchCoordinationLayer({ updatedAt, tasks }, actorRole);
  const readiness = buildAssistedExecutionDispatchReadinessLayer({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionAssistanceSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const launchAdvisories = buildLaunchAdvisories(preflight, coordination, readiness);
  const startWindowSignals = buildStartWindowSignals(preflight, readiness, knowledge);
  const holdReasons = buildOrchestrationHoldReasons(preflight, coordination);
  const activationPosture = buildDispatchActivationPosture(preflight, launchAdvisories, startWindowSignals);
  const advisorySummary = buildAdvisorySummary(launchAdvisories, holdReasons, activationPosture);

  return {
    updatedAt,
    actor_role: actorRole,
    advisory_kind: 'assisted-execution-dispatch-launch-advisory',
    launch_advisories: launchAdvisories,
    start_window_signals: startWindowSignals,
    orchestration_hold_reasons: holdReasons,
    dispatch_activation_posture: activationPosture,
    advisory_summary: advisorySummary,
    advisory_payload: {
      actor_role: actorRole,
      recommendation: preflight.dispatch_start_recommendation?.status || 'hold',
      go_no_go: preflight.dispatch_start_recommendation?.go_no_go || 'go',
      read_only: true,
      explainable: true,
      decision_owner: decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
    },
  };
}

module.exports = {
  buildAssistedExecutionDispatchLaunchAdvisoryLayer,
  buildLaunchAdvisories,
  buildStartWindowSignals,
  buildOrchestrationHoldReasons,
  buildDispatchActivationPosture,
  buildAdvisorySummary,
};
