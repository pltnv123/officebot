const { buildAssistedExecutionLaneReadinessReconciliationLayer } = require('./assistedExecutionLaneReadinessReconciliationLayer');
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

function buildHandoffContract(packet = {}, reconciliation = {}, governance = {}, laneName = 'backend') {
  const laneMatrix = (reconciliation.lane_readiness_matrix || []).find((item) => item.lane === laneName) || {};
  const laneBlockers = (reconciliation.lane_blocker_reconciliation || []).find((item) => item.lane === laneName) || {};
  return {
    lane: laneName,
    contract_kind: 'read_only_handoff_contract',
    task_framing: packet.tasks || [],
    dependencies: packet.dependencies || [],
    blockers: packet.blockers || [],
    readiness_assumptions: {
      handoff_ready: packet.handoff_ready === true,
      reconciliation_ready: reconciliation.reconciliation_outcome?.outcome === 'lane_reconciliation_ready',
      governance_release_readiness: governance.release_to_handoff_readiness?.readiness || 'not_ready_for_handoff_surface',
    },
    contract_boundaries: {
      read_only: true,
      no_execution_side_effects: true,
      no_queue_mutation: true,
      no_agent_activation: true,
    },
    contract_metrics: {
      task_count: laneMatrix.task_count || 0,
      blocker_count: laneBlockers.blocker_count || 0,
      dependency_count: laneMatrix.dependency_count || 0,
    },
  };
}

function buildHandoffContractMatrix(contracts = [], governance = {}, dispatchDecision = {}) {
  return contracts.map((contract) => ({
    lane: contract.lane,
    contract_kind: contract.contract_kind,
    governance_outcome: governance.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
    dispatch_outcome: dispatchDecision.recommended_dispatch_decision_outcome?.outcome || 'dispatch_hold_decision',
    task_count: contract.contract_metrics?.task_count || 0,
    blocker_count: contract.contract_metrics?.blocker_count || 0,
  }));
}

function buildHandoffContractSummary(contracts = [], reconciliation = {}) {
  return {
    contract_total: contracts.length,
    ready_contracts: contracts.filter((item) => item.readiness_assumptions?.handoff_ready === true).length,
    reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
    explainable: true,
  };
}

function buildAssistedExecutionAgentHandoffContractsLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const reconciliation = buildAssistedExecutionLaneReadinessReconciliationLayer({ updatedAt, tasks }, actorRole);
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

  const backendContract = buildHandoffContract(laneHandoff.backend_lane_packet || {}, reconciliation, governance, 'backend');
  const iosContract = buildHandoffContract(laneHandoff.ios_lane_packet || {}, reconciliation, governance, 'ios');
  const qaContract = buildHandoffContract(laneHandoff.qa_lane_packet || {}, reconciliation, governance, 'qa');
  const contracts = [backendContract, iosContract, qaContract];
  const contractMatrix = buildHandoffContractMatrix(contracts, governance, dispatchDecision);
  const contractSummary = buildHandoffContractSummary(contracts, reconciliation);

  return {
    updatedAt,
    actor_role: actorRole,
    contract_kind: 'assisted-execution-agent-handoff-contracts',
    backend_handoff_contract: backendContract,
    ios_handoff_contract: iosContract,
    qa_handoff_contract: qaContract,
    handoff_contract_matrix: contractMatrix,
    handoff_contract_summary: contractSummary,
    handoff_contract_payload: {
      actor_role: actorRole,
      governance_outcome: governance.governance_finalization_payload?.decision_outcome || 'dispatch_hold_decision',
      reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
      activation_review_decision: activationReview.recommended_activation_review_decision?.decision || 'review_hold',
      advisory_recommendation: advisory.advisory_payload?.recommendation || 'hold',
      preflight_status: preflight.dispatch_start_recommendation?.status || 'hold',
      coordination_owner: coordination.coordination_payload?.suggested_owner || 'orchestrator',
      readiness_status: readiness.dispatch_go_no_go_summary?.status || 'hold',
      decision_owner: decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
      read_only: true,
      explainable: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionAgentHandoffContractsLayer,
  buildHandoffContract,
  buildHandoffContractMatrix,
  buildHandoffContractSummary,
};
