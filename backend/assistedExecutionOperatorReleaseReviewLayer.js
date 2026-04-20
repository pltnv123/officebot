const { buildAssistedExecutionLaunchSimulationLayer } = require('./assistedExecutionLaunchSimulationLayer');
const { buildAssistedExecutionEnvelopeLayer } = require('./assistedExecutionEnvelopeLayer');
const { buildAssistedExecutionAgentHandoffContractsLayer } = require('./assistedExecutionAgentHandoffContractsLayer');
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

function buildReleaseGates(governance = {}, simulationSummary = {}, reconciliation = {}) {
  return [
    {
      gate: 'governance_release_readiness',
      status: governance.release_to_handoff_readiness?.readiness === 'ready_for_handoff_surface' ? 'pass' : 'hold',
      detail: governance.release_to_handoff_readiness?.readiness || 'not_ready_for_handoff_surface',
    },
    {
      gate: 'simulation_posture',
      status: (simulationSummary.simulated_ready_agents || 0) > 0 ? 'pass' : 'hold',
      detail: `${simulationSummary.simulated_ready_agents || 0} simulated ready agents`,
    },
    {
      gate: 'lane_reconciliation',
      status: reconciliation.reconciliation_outcome?.outcome === 'lane_reconciliation_ready' ? 'pass' : 'hold',
      detail: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
    },
  ];
}

function buildOperatorReviewCheckpoints(simulations = []) {
  return simulations.map((simulation) => ({
    agent: simulation.agent,
    checkpoint: 'review_simulated_launch_posture',
    status: simulation.execution_framing?.simulated_launch_posture === 'simulated_ready' ? 'ready' : 'hold',
    blockers: simulation.blocker_propagation || [],
  }));
}

function buildPerAgentReleaseReview(simulations = [], envelopes = {}) {
  return simulations.map((simulation) => ({
    agent: simulation.agent,
    simulated_launch_posture: simulation.execution_framing?.simulated_launch_posture || 'simulated_hold',
    scope_count: Array.isArray(simulation.simulated_scope) ? simulation.simulated_scope.length : 0,
    blocker_count: Array.isArray(simulation.blocker_propagation) ? simulation.blocker_propagation.length : 0,
    envelope_kind: envelopes[`${simulation.agent}_execution_envelope`]?.envelope_kind || 'read_only_execution_envelope',
    explainable: true,
  }));
}

function buildReleasePosture(releaseGates = [], perAgentReview = []) {
  const holds = releaseGates.filter((item) => item.status !== 'pass').length;
  const readyAgents = perAgentReview.filter((item) => item.simulated_launch_posture === 'simulated_ready').length;
  return {
    posture: holds === 0 && readyAgents === perAgentReview.length ? 'operator_review_ready' : 'operator_review_hold',
    hold_gate_total: holds,
    ready_agent_total: readyAgents,
    explainable: true,
  };
}

function buildOperatorReleaseReviewSummary(releaseGates = [], checkpoints = [], posture = {}) {
  return {
    gate_total: releaseGates.length,
    ready_checkpoints: checkpoints.filter((item) => item.status === 'ready').length,
    release_posture: posture.posture || 'operator_review_hold',
    explainable: true,
  };
}

function buildAssistedExecutionOperatorReleaseReviewLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const simulation = buildAssistedExecutionLaunchSimulationLayer({ updatedAt, tasks }, actorRole);
  const envelopes = buildAssistedExecutionEnvelopeLayer({ updatedAt, tasks }, actorRole);
  const contracts = buildAssistedExecutionAgentHandoffContractsLayer({ updatedAt, tasks }, actorRole);
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

  const simulations = [
    simulation.backend_launch_simulation,
    simulation.ios_launch_simulation,
    simulation.qa_launch_simulation,
  ].filter(Boolean);

  const releaseGates = buildReleaseGates(governance, simulation.launch_simulation_summary || {}, reconciliation);
  const checkpoints = buildOperatorReviewCheckpoints(simulations);
  const perAgentReview = buildPerAgentReleaseReview(simulations, envelopes);
  const releasePosture = buildReleasePosture(releaseGates, perAgentReview);
  const summary = buildOperatorReleaseReviewSummary(releaseGates, checkpoints, releasePosture);

  return {
    updatedAt,
    actor_role: actorRole,
    review_surface_kind: 'assisted-execution-operator-release-review',
    release_gates: releaseGates,
    operator_review_checkpoints: checkpoints,
    release_posture: releasePosture,
    per_agent_release_review: perAgentReview,
    operator_release_review_summary: summary,
    operator_release_review_payload: {
      actor_role: actorRole,
      governance_outcome: governance.governance_finalization_payload?.decision_outcome || 'dispatch_hold_decision',
      dispatch_outcome: dispatchDecision.decision_payload?.outcome || 'dispatch_hold_decision',
      activation_review_decision: activationReview.recommended_activation_review_decision?.decision || 'review_hold',
      advisory_recommendation: advisory.advisory_payload?.recommendation || 'hold',
      preflight_status: preflight.dispatch_start_recommendation?.status || 'hold',
      coordination_owner: coordination.coordination_payload?.suggested_owner || 'orchestrator',
      readiness_status: readiness.dispatch_go_no_go_summary?.status || 'hold',
      decision_owner: decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
      contract_total: contracts.handoff_contract_summary?.contract_total || 0,
      lane_handoff_ready: laneHandoff.lane_handoff_summary?.ready_lanes || 0,
      reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
      simulation_ready_agents: simulation.launch_simulation_summary?.simulated_ready_agents || 0,
      read_only: true,
      explainable: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionOperatorReleaseReviewLayer,
  buildReleaseGates,
  buildOperatorReviewCheckpoints,
  buildPerAgentReleaseReview,
  buildReleasePosture,
  buildOperatorReleaseReviewSummary,
};
