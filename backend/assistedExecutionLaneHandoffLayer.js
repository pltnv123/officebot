const { buildAssistedExecutionDispatchGovernanceFinalizationLayer } = require('./assistedExecutionDispatchGovernanceFinalizationLayer');
const { buildAssistedExecutionDispatchDecisionLayer } = require('./assistedExecutionDispatchDecisionLayer');
const { buildAssistedExecutionDispatchActivationReviewLayer } = require('./assistedExecutionDispatchActivationReviewLayer');
const { buildAssistedExecutionDispatchLaunchAdvisoryLayer } = require('./assistedExecutionDispatchLaunchAdvisoryLayer');
const { buildAssistedExecutionDispatchOrchestrationPreflightLayer } = require('./assistedExecutionDispatchOrchestrationPreflightLayer');
const { buildAssistedExecutionDispatchCoordinationLayer } = require('./assistedExecutionDispatchCoordinationLayer');
const { buildAssistedExecutionDispatchReadinessLayer } = require('./assistedExecutionDispatchReadinessLayer');
const { buildAssistedExecutionDispatchLayer, detectTaskType } = require('./assistedExecutionDispatchLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildLanePacket(lane, tasks = [], governance = {}, coordination = {}, readiness = {}, dispatch = {}) {
  const laneTasks = tasks.filter((task) => {
    const type = detectTaskType(task);
    return lane === 'backend' ? type === 'backend' : lane === 'ios' ? type === 'ios' : type === 'qa';
  });

  return {
    lane,
    handoff_ready: governance.release_to_handoff_readiness?.readiness === 'ready_for_handoff_surface',
    task_count: laneTasks.length,
    tasks: laneTasks.slice(0, 6).map((task) => ({
      task_id: task.id || null,
      title: task.title || '',
      task_type: detectTaskType(task),
      assignment_state: task.assignment_state || 'unknown',
      approval_state: task.approval_state || 'none',
    })),
    dependencies: (coordination.dispatch_dependencies || []).filter((item) =>
      laneTasks.some((task) => task.id === item.task_id)
    ).slice(0, 6),
    blockers: [
      ...(readiness.handoff_blockers || []).filter((item) => laneTasks.some((task) => task.id === item.task_id)),
      ...(dispatch.dispatch_recommendations || []).filter((item) => item.task_type === lane && item.urgency === 'high').map((item) => ({
        task_id: item.task_id,
        blocker_type: 'high_priority_attention',
        detail: item.reason,
      })),
    ].slice(0, 6),
    readiness_context: {
      governance_outcome: governance.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
      release_readiness: governance.release_to_handoff_readiness?.readiness || 'not_ready_for_handoff_surface',
      explainable: true,
    },
  };
}

function buildLaneHandoffPackets(tasks = [], governance = {}, coordination = {}, readiness = {}, dispatch = {}) {
  return [
    buildLanePacket('backend', tasks, governance, coordination, readiness, dispatch),
    buildLanePacket('ios', tasks, governance, coordination, readiness, dispatch),
    buildLanePacket('qa', tasks, governance, coordination, readiness, dispatch),
  ];
}

function buildLaneHandoffSummary(packets = [], governance = {}) {
  return {
    lane_total: packets.length,
    ready_lanes: packets.filter((item) => item.handoff_ready).length,
    total_tasks: packets.reduce((sum, item) => sum + Number(item.task_count || 0), 0),
    governance_outcome: governance.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
    release_readiness: governance.release_to_handoff_readiness?.readiness || 'not_ready_for_handoff_surface',
    explainable: true,
  };
}

function buildAssistedExecutionLaneHandoffLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const governance = buildAssistedExecutionDispatchGovernanceFinalizationLayer({ updatedAt, tasks }, actorRole);
  const dispatchDecision = buildAssistedExecutionDispatchDecisionLayer({ updatedAt, tasks }, actorRole);
  const activationReview = buildAssistedExecutionDispatchActivationReviewLayer({ updatedAt, tasks }, actorRole);
  const advisory = buildAssistedExecutionDispatchLaunchAdvisoryLayer({ updatedAt, tasks }, actorRole);
  const preflight = buildAssistedExecutionDispatchOrchestrationPreflightLayer({ updatedAt, tasks }, actorRole);
  const coordination = buildAssistedExecutionDispatchCoordinationLayer({ updatedAt, tasks }, actorRole);
  const readiness = buildAssistedExecutionDispatchReadinessLayer({ updatedAt, tasks }, actorRole);
  const dispatch = buildAssistedExecutionDispatchLayer({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionAssistanceSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const lanePackets = buildLaneHandoffPackets(tasks, governance, coordination, readiness, dispatch);
  const summary = buildLaneHandoffSummary(lanePackets, governance);

  return {
    updatedAt,
    actor_role: actorRole,
    handoff_kind: 'assisted-execution-lane-handoff',
    lane_handoff_packets: lanePackets,
    backend_lane_packet: lanePackets.find((item) => item.lane === 'backend') || buildLanePacket('backend', [], governance, coordination, readiness, dispatch),
    ios_lane_packet: lanePackets.find((item) => item.lane === 'ios') || buildLanePacket('ios', [], governance, coordination, readiness, dispatch),
    qa_lane_packet: lanePackets.find((item) => item.lane === 'qa') || buildLanePacket('qa', [], governance, coordination, readiness, dispatch),
    lane_handoff_summary: summary,
    lane_handoff_payload: {
      actor_role: actorRole,
      governance_outcome: governance.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
      release_readiness: governance.release_to_handoff_readiness?.readiness || 'not_ready_for_handoff_surface',
      decision_owner: dispatchDecision.decision_payload?.decision_owner || decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
      advisory_recommendation: advisory.advisory_payload?.recommendation || 'hold',
      preflight_status: preflight.dispatch_start_recommendation?.status || 'hold',
      activation_review_decision: activationReview.recommended_activation_review_decision?.decision || 'review_hold',
      explainable: true,
      read_only: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionLaneHandoffLayer,
  buildLanePacket,
  buildLaneHandoffPackets,
  buildLaneHandoffSummary,
};
