const { buildAssistedExecutionLaneHandoffLayer } = require('./assistedExecutionLaneHandoffLayer');
const { buildAssistedExecutionDispatchGovernanceFinalizationLayer } = require('./assistedExecutionDispatchGovernanceFinalizationLayer');
const { buildAssistedExecutionDispatchDecisionLayer } = require('./assistedExecutionDispatchDecisionLayer');
const { buildAssistedExecutionDispatchActivationReviewLayer } = require('./assistedExecutionDispatchActivationReviewLayer');
const { buildAssistedExecutionDispatchLaunchAdvisoryLayer } = require('./assistedExecutionDispatchLaunchAdvisoryLayer');
const { buildAssistedExecutionDispatchOrchestrationPreflightLayer } = require('./assistedExecutionDispatchOrchestrationPreflightLayer');
const { buildAssistedExecutionDispatchCoordinationLayer } = require('./assistedExecutionDispatchCoordinationLayer');
const { buildAssistedExecutionDispatchReadinessLayer } = require('./assistedExecutionDispatchReadinessLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildLaneReadinessMatrix(packets = []) {
  return packets.map((packet) => ({
    lane: packet.lane,
    handoff_ready: packet.handoff_ready === true,
    task_count: packet.task_count || 0,
    blocker_count: Array.isArray(packet.blockers) ? packet.blockers.length : 0,
    dependency_count: Array.isArray(packet.dependencies) ? packet.dependencies.length : 0,
  }));
}

function buildCrossLaneDependencyMismatches(packets = []) {
  const mismatches = [];
  const allTaskIds = new Set(packets.flatMap((packet) => (packet.tasks || []).map((task) => task.task_id)));

  for (const packet of packets) {
    for (const dependency of packet.dependencies || []) {
      const dependsOn = Array.isArray(dependency.depends_on) ? dependency.depends_on : [];
      const missing = dependsOn.filter((dep) => !allTaskIds.has(dep));
      if (missing.length > 0) {
        mismatches.push({
          lane: packet.lane,
          task_id: dependency.task_id,
          mismatch_type: 'missing_cross_lane_dependency',
          missing_dependencies: missing,
        });
      }
    }
  }

  return mismatches.slice(0, 12);
}

function buildLaneBlockerReconciliation(packets = []) {
  return packets.map((packet) => ({
    lane: packet.lane,
    blocker_count: Array.isArray(packet.blockers) ? packet.blockers.length : 0,
    blocker_types: Array.from(new Set((packet.blockers || []).map((item) => item.blocker_type || 'unknown'))).slice(0, 6),
  }));
}

function buildReconciliationOutcome(matrix = [], mismatches = [], blockers = []) {
  const blockedLanes = matrix.filter((item) => item.handoff_ready !== true || item.blocker_count > 0).length;
  const mismatchCount = mismatches.length;
  const blockerCount = blockers.reduce((sum, item) => sum + Number(item.blocker_count || 0), 0);
  return {
    outcome: blockedLanes === 0 && mismatchCount === 0 && blockerCount === 0
      ? 'lane_reconciliation_ready'
      : 'lane_reconciliation_hold',
    blocked_lane_total: blockedLanes,
    mismatch_total: mismatchCount,
    blocker_total: blockerCount,
    explainable: true,
  };
}

function buildLaneReconciliationSummary(outcome = {}, matrix = [], mismatches = []) {
  return {
    lane_total: matrix.length,
    ready_lanes: matrix.filter((item) => item.handoff_ready === true).length,
    mismatch_total: mismatches.length,
    reconciliation_outcome: outcome.outcome || 'lane_reconciliation_hold',
    explainable: true,
  };
}

function buildAssistedExecutionLaneReadinessReconciliationLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const laneHandoff = buildAssistedExecutionLaneHandoffLayer({ updatedAt, tasks }, actorRole);
  const governance = buildAssistedExecutionDispatchGovernanceFinalizationLayer({ updatedAt, tasks }, actorRole);
  const dispatchDecision = buildAssistedExecutionDispatchDecisionLayer({ updatedAt, tasks }, actorRole);
  const activationReview = buildAssistedExecutionDispatchActivationReviewLayer({ updatedAt, tasks }, actorRole);
  const advisory = buildAssistedExecutionDispatchLaunchAdvisoryLayer({ updatedAt, tasks }, actorRole);
  const preflight = buildAssistedExecutionDispatchOrchestrationPreflightLayer({ updatedAt, tasks }, actorRole);
  const coordination = buildAssistedExecutionDispatchCoordinationLayer({ updatedAt, tasks }, actorRole);
  const readiness = buildAssistedExecutionDispatchReadinessLayer({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionAssistanceSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const matrix = buildLaneReadinessMatrix(laneHandoff.lane_handoff_packets || []);
  const mismatches = buildCrossLaneDependencyMismatches(laneHandoff.lane_handoff_packets || []);
  const blockerReconciliation = buildLaneBlockerReconciliation(laneHandoff.lane_handoff_packets || []);
  const outcome = buildReconciliationOutcome(matrix, mismatches, blockerReconciliation);
  const summary = buildLaneReconciliationSummary(outcome, matrix, mismatches);

  return {
    updatedAt,
    actor_role: actorRole,
    reconciliation_kind: 'assisted-execution-lane-readiness-reconciliation',
    lane_readiness_matrix: matrix,
    cross_lane_dependency_mismatches: mismatches,
    lane_blocker_reconciliation: blockerReconciliation,
    reconciliation_outcome: outcome,
    lane_reconciliation_summary: summary,
    lane_reconciliation_payload: {
      actor_role: actorRole,
      governance_outcome: governance.governance_finalization_payload?.decision_outcome || 'dispatch_hold_decision',
      dispatch_outcome: dispatchDecision.decision_payload?.outcome || 'dispatch_hold_decision',
      activation_review_decision: activationReview.recommended_activation_review_decision?.decision || 'review_hold',
      advisory_recommendation: advisory.advisory_payload?.recommendation || 'hold',
      preflight_status: preflight.dispatch_start_recommendation?.status || 'hold',
      coordination_owner: coordination.coordination_payload?.suggested_owner || 'orchestrator',
      readiness_status: readiness.dispatch_go_no_go_summary?.status || 'hold',
      decision_owner: decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
      reconciliation_outcome: outcome.outcome,
      explainable: true,
      read_only: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionLaneReadinessReconciliationLayer,
  buildLaneReadinessMatrix,
  buildCrossLaneDependencyMismatches,
  buildLaneBlockerReconciliation,
  buildReconciliationOutcome,
  buildLaneReconciliationSummary,
};
