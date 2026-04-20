const { buildAssistedExecutionDispatchLaunchAdvisoryLayer } = require('./assistedExecutionDispatchLaunchAdvisoryLayer');
const { buildAssistedExecutionDispatchOrchestrationPreflightLayer } = require('./assistedExecutionDispatchOrchestrationPreflightLayer');
const { buildAssistedExecutionDispatchCoordinationLayer } = require('./assistedExecutionDispatchCoordinationLayer');
const { buildAssistedExecutionDispatchReadinessLayer } = require('./assistedExecutionDispatchReadinessLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildActivationReviewChecklist(advisory = {}, preflight = {}, readiness = {}) {
  return [
    {
      item: 'launch_advisory_reviewed',
      status: (advisory.launch_advisories || []).length > 0 ? 'ready' : 'missing',
      detail: `${(advisory.launch_advisories || []).length} advisories available`,
    },
    {
      item: 'preflight_status_reviewed',
      status: preflight.dispatch_start_recommendation?.status === 'start_ready' ? 'ready' : 'hold',
      detail: preflight.dispatch_start_recommendation?.reason || 'preflight status unavailable',
    },
    {
      item: 'handoff_blockers_reviewed',
      status: (readiness.handoff_blockers || []).length === 0 ? 'ready' : 'hold',
      detail: `${(readiness.handoff_blockers || []).length} handoff blockers`,
    },
  ];
}

function buildAdvisoryConsensusSummary(advisory = {}, decision = {}, knowledge = {}) {
  return {
    launch_posture: advisory.dispatch_activation_posture?.posture || 'hold_and_review',
    advisory_recommendation: advisory.advisory_payload?.recommendation || 'hold',
    suggested_owner: advisory.advisory_payload?.decision_owner || decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
    explainable: advisory.dispatch_activation_posture?.explainable === true,
  };
}

function buildLaunchBlockersDigest(advisory = {}, coordination = {}, readiness = {}) {
  return {
    hold_reason_total: (advisory.orchestration_hold_reasons || []).length,
    coordination_blocker_total: (coordination.coordination_blockers || []).length,
    handoff_blocker_total: (readiness.handoff_blockers || []).length,
    top_hold_reasons: (advisory.orchestration_hold_reasons || []).slice(0, 5),
  };
}

function buildRecommendedActivationReviewDecision(checklist = [], consensus = {}, digest = {}) {
  const hasHold = checklist.some((item) => item.status !== 'ready') || Number(digest.hold_reason_total || 0) > 0;
  return {
    decision: hasHold ? 'review_hold' : 'review_ready',
    reason: hasHold ? 'activation_review_requires_hold' : 'activation_review_ready',
    suggested_owner: consensus.suggested_owner || 'orchestrator',
    explainable: true,
  };
}

function buildActivationReviewSummary(checklist = [], digest = {}, decision = {}) {
  return {
    checklist_total: checklist.length,
    ready_items: checklist.filter((item) => item.status === 'ready').length,
    hold_items: checklist.filter((item) => item.status !== 'ready').length,
    blocker_total: Number(digest.hold_reason_total || 0),
    decision: decision.decision || 'review_hold',
  };
}

function buildAssistedExecutionDispatchActivationReviewLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const advisory = buildAssistedExecutionDispatchLaunchAdvisoryLayer({ updatedAt, tasks }, actorRole);
  const preflight = buildAssistedExecutionDispatchOrchestrationPreflightLayer({ updatedAt, tasks }, actorRole);
  const coordination = buildAssistedExecutionDispatchCoordinationLayer({ updatedAt, tasks }, actorRole);
  const readiness = buildAssistedExecutionDispatchReadinessLayer({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionAssistanceSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const checklist = buildActivationReviewChecklist(advisory, preflight, readiness);
  const consensus = buildAdvisoryConsensusSummary(advisory, decision, knowledge);
  const blockersDigest = buildLaunchBlockersDigest(advisory, coordination, readiness);
  const reviewDecision = buildRecommendedActivationReviewDecision(checklist, consensus, blockersDigest);
  const reviewSummary = buildActivationReviewSummary(checklist, blockersDigest, reviewDecision);

  return {
    updatedAt,
    actor_role: actorRole,
    review_kind: 'assisted-execution-dispatch-activation-review',
    activation_review_checklist: checklist,
    advisory_consensus_summary: consensus,
    launch_blockers_digest: blockersDigest,
    recommended_activation_review_decision: reviewDecision,
    activation_review_summary: reviewSummary,
    activation_review_payload: {
      actor_role: actorRole,
      decision: reviewDecision.decision,
      suggested_owner: reviewDecision.suggested_owner,
      explainable: true,
      read_only: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionDispatchActivationReviewLayer,
  buildActivationReviewChecklist,
  buildAdvisoryConsensusSummary,
  buildLaunchBlockersDigest,
  buildRecommendedActivationReviewDecision,
  buildActivationReviewSummary,
};
