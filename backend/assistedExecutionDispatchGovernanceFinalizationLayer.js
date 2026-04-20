const { buildAssistedExecutionDispatchDecisionLayer } = require('./assistedExecutionDispatchDecisionLayer');
const { buildAssistedExecutionDispatchActivationReviewLayer } = require('./assistedExecutionDispatchActivationReviewLayer');
const { buildAssistedExecutionDispatchLaunchAdvisoryLayer } = require('./assistedExecutionDispatchLaunchAdvisoryLayer');
const { buildAssistedExecutionDispatchOrchestrationPreflightLayer } = require('./assistedExecutionDispatchOrchestrationPreflightLayer');
const { buildAssistedExecutionDispatchCoordinationLayer } = require('./assistedExecutionDispatchCoordinationLayer');
const { buildAssistedExecutionDispatchReadinessLayer } = require('./assistedExecutionDispatchReadinessLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildGovernanceDecisionOutcome(dispatchDecision = {}, activationReview = {}) {
  return {
    decision_outcome: dispatchDecision.recommended_dispatch_decision_outcome?.outcome || 'dispatch_hold_decision',
    review_posture: activationReview.recommended_activation_review_decision?.decision || 'review_hold',
    explainable: true,
  };
}

function buildReviewPostureSummary(activationReview = {}, advisory = {}, preflight = {}) {
  return {
    activation_review_decision: activationReview.recommended_activation_review_decision?.decision || 'review_hold',
    dispatch_posture: advisory.dispatch_activation_posture?.posture || 'hold_and_review',
    preflight_status: preflight.dispatch_start_recommendation?.status || 'hold',
    explainable: true,
  };
}

function buildGovernanceGates(dispatchDecision = {}, coordination = {}, readiness = {}) {
  return [
    {
      gate: 'decision_surface',
      status: dispatchDecision.recommended_dispatch_decision_outcome?.outcome === 'dispatch_review_ready' ? 'pass' : 'hold',
      detail: dispatchDecision.recommended_dispatch_decision_outcome?.reason || 'decision surface unavailable',
    },
    {
      gate: 'coordination_blockers',
      status: (coordination.coordination_blockers || []).length === 0 ? 'pass' : 'hold',
      detail: `${(coordination.coordination_blockers || []).length} coordination blockers`,
    },
    {
      gate: 'handoff_readiness',
      status: (readiness.handoff_blockers || []).length === 0 ? 'pass' : 'hold',
      detail: `${(readiness.handoff_blockers || []).length} handoff blockers`,
    },
  ];
}

function buildReleaseToHandoffReadiness(governanceGates = [], knowledge = {}, decision = {}) {
  const holdCount = governanceGates.filter((item) => item.status !== 'pass').length;
  return {
    readiness: holdCount === 0 ? 'ready_for_handoff_surface' : 'not_ready_for_handoff_surface',
    hold_count: holdCount,
    suggested_owner: decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
    explainable: true,
  };
}

function buildGovernanceFinalizationSummary(governanceOutcome = {}, reviewPosture = {}, releaseReadiness = {}, governanceGates = []) {
  return {
    governance_decision_outcome: governanceOutcome.decision_outcome || 'dispatch_hold_decision',
    review_posture: reviewPosture.activation_review_decision || 'review_hold',
    gate_total: governanceGates.length,
    passed_gates: governanceGates.filter((item) => item.status === 'pass').length,
    release_readiness: releaseReadiness.readiness || 'not_ready_for_handoff_surface',
    explainable: true,
  };
}

function buildAssistedExecutionDispatchGovernanceFinalizationLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const dispatchDecision = buildAssistedExecutionDispatchDecisionLayer({ updatedAt, tasks }, actorRole);
  const activationReview = buildAssistedExecutionDispatchActivationReviewLayer({ updatedAt, tasks }, actorRole);
  const advisory = buildAssistedExecutionDispatchLaunchAdvisoryLayer({ updatedAt, tasks }, actorRole);
  const preflight = buildAssistedExecutionDispatchOrchestrationPreflightLayer({ updatedAt, tasks }, actorRole);
  const coordination = buildAssistedExecutionDispatchCoordinationLayer({ updatedAt, tasks }, actorRole);
  const readiness = buildAssistedExecutionDispatchReadinessLayer({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionAssistanceSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const governanceOutcome = buildGovernanceDecisionOutcome(dispatchDecision, activationReview);
  const reviewPosture = buildReviewPostureSummary(activationReview, advisory, preflight);
  const governanceGates = buildGovernanceGates(dispatchDecision, coordination, readiness);
  const releaseReadiness = buildReleaseToHandoffReadiness(governanceGates, knowledge, decision);
  const finalizationSummary = buildGovernanceFinalizationSummary(governanceOutcome, reviewPosture, releaseReadiness, governanceGates);

  return {
    updatedAt,
    actor_role: actorRole,
    governance_kind: 'assisted-execution-dispatch-governance-finalization',
    governance_decision_outcome: governanceOutcome,
    review_posture_summary: reviewPosture,
    governance_gates: governanceGates,
    release_to_handoff_readiness: releaseReadiness,
    governance_finalization_summary: finalizationSummary,
    governance_finalization_payload: {
      actor_role: actorRole,
      decision_outcome: governanceOutcome.decision_outcome,
      release_readiness: releaseReadiness.readiness,
      explainable: true,
      read_only: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionDispatchGovernanceFinalizationLayer,
  buildGovernanceDecisionOutcome,
  buildReviewPostureSummary,
  buildGovernanceGates,
  buildReleaseToHandoffReadiness,
  buildGovernanceFinalizationSummary,
};
