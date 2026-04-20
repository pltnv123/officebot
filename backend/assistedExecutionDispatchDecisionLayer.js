const { buildAssistedExecutionDispatchActivationReviewLayer } = require('./assistedExecutionDispatchActivationReviewLayer');
const { buildAssistedExecutionDispatchLaunchAdvisoryLayer } = require('./assistedExecutionDispatchLaunchAdvisoryLayer');
const { buildAssistedExecutionDispatchOrchestrationPreflightLayer } = require('./assistedExecutionDispatchOrchestrationPreflightLayer');
const { buildAssistedExecutionDispatchCoordinationLayer } = require('./assistedExecutionDispatchCoordinationLayer');
const { buildAssistedExecutionDispatchReadinessLayer } = require('./assistedExecutionDispatchReadinessLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildDispatchDecisionOptions(review = {}, advisory = {}) {
  return [
    {
      option: 'hold_dispatch',
      posture: 'conservative',
      reason: review.recommended_activation_review_decision?.reason || 'activation_review_requires_hold',
      explainable: true,
    },
    {
      option: 'conditional_dispatch_review',
      posture: 'guarded',
      reason: advisory.dispatch_activation_posture?.posture || 'hold_and_review',
      explainable: true,
    },
    {
      option: 'dispatch_ready_path',
      posture: 'progressive',
      reason: review.recommended_activation_review_decision?.decision === 'review_ready' ? 'review_ready' : 'not_yet_ready',
      explainable: true,
    },
  ];
}

function buildApprovalStyleDecisionFraming(review = {}, advisory = {}, decision = {}, knowledge = {}) {
  return {
    decision_owner: review.activation_review_payload?.suggested_owner || advisory.advisory_payload?.decision_owner || decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
    framing_mode: 'approval_style_governance',
    review_decision: review.recommended_activation_review_decision?.decision || 'review_hold',
    explainable: true,
  };
}

function buildDecisionBlockersMatrix(review = {}, advisory = {}, coordination = {}, readiness = {}) {
  return {
    activation_review_holds: review.launch_blockers_digest?.hold_reason_total || 0,
    advisory_holds: (advisory.orchestration_hold_reasons || []).length,
    coordination_blockers: (coordination.coordination_blockers || []).length,
    readiness_blockers: (readiness.handoff_blockers || []).length,
  };
}

function buildRecommendedDispatchDecisionOutcome(review = {}, blockers = {}, framing = {}) {
  const blocked = Object.values(blockers).some((value) => Number(value || 0) > 0);
  return {
    outcome: blocked ? 'dispatch_hold_decision' : 'dispatch_review_ready',
    reason: blocked ? 'decision_blockers_present' : 'decision_surface_ready',
    decision_owner: framing.decision_owner || 'orchestrator',
    explainable: true,
  };
}

function buildDecisionSummary(options = [], outcome = {}, blockers = {}) {
  return {
    option_total: options.length,
    blocker_total: Object.values(blockers).reduce((sum, value) => sum + Number(value || 0), 0),
    outcome: outcome.outcome || 'dispatch_hold_decision',
    explainable: outcome.explainable === true,
  };
}

function buildAssistedExecutionDispatchDecisionLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const review = buildAssistedExecutionDispatchActivationReviewLayer({ updatedAt, tasks }, actorRole);
  const advisory = buildAssistedExecutionDispatchLaunchAdvisoryLayer({ updatedAt, tasks }, actorRole);
  const preflight = buildAssistedExecutionDispatchOrchestrationPreflightLayer({ updatedAt, tasks }, actorRole);
  const coordination = buildAssistedExecutionDispatchCoordinationLayer({ updatedAt, tasks }, actorRole);
  const readiness = buildAssistedExecutionDispatchReadinessLayer({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionAssistanceSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const options = buildDispatchDecisionOptions(review, advisory);
  const framing = buildApprovalStyleDecisionFraming(review, advisory, decision, knowledge);
  const blockers = buildDecisionBlockersMatrix(review, advisory, coordination, readiness);
  const outcome = buildRecommendedDispatchDecisionOutcome(review, blockers, framing);
  const summary = buildDecisionSummary(options, outcome, blockers);

  return {
    updatedAt,
    actor_role: actorRole,
    decision_kind: 'assisted-execution-dispatch-decision',
    dispatch_decision_options: options,
    approval_style_decision_framing: framing,
    decision_blockers_matrix: blockers,
    recommended_dispatch_decision_outcome: outcome,
    decision_summary: summary,
    decision_payload: {
      actor_role: actorRole,
      decision_owner: framing.decision_owner,
      outcome: outcome.outcome,
      explainable: true,
      read_only: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionDispatchDecisionLayer,
  buildDispatchDecisionOptions,
  buildApprovalStyleDecisionFraming,
  buildDecisionBlockersMatrix,
  buildRecommendedDispatchDecisionOutcome,
  buildDecisionSummary,
};
