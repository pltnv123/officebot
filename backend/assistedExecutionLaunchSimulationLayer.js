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

function buildLaunchSimulation(envelope = {}, governance = {}, agent = 'backend') {
  return {
    agent,
    simulation_kind: 'read_only_launch_simulation',
    simulated_scope: envelope.scope || [],
    dependency_interpretation: envelope.dependencies || [],
    blocker_propagation: envelope.blockers || [],
    readiness_assumptions: envelope.readiness_assumptions || {
      handoff_ready: false,
      reconciliation_ready: false,
      governance_release_readiness: 'not_ready_for_handoff_surface',
    },
    execution_framing: {
      governance_outcome: governance.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
      simulated_launch_posture: envelope.readiness_assumptions?.handoff_ready ? 'simulated_ready' : 'simulated_hold',
      explainable: true,
    },
    simulation_boundaries: {
      read_only: true,
      no_execution_side_effects: true,
      no_queue_mutation: true,
      no_agent_activation: true,
    },
  };
}

function buildLaunchSimulationMatrix(simulations = [], governance = {}, envelopes = {}) {
  return simulations.map((simulation) => ({
    agent: simulation.agent,
    simulation_kind: simulation.simulation_kind,
    governance_outcome: governance.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
    envelope_kind: envelopes[`${simulation.agent}_execution_envelope`]?.envelope_kind || 'read_only_execution_envelope',
    scope_count: Array.isArray(simulation.simulated_scope) ? simulation.simulated_scope.length : 0,
    blocker_count: Array.isArray(simulation.blocker_propagation) ? simulation.blocker_propagation.length : 0,
  }));
}

function buildLaunchSimulationSummary(simulations = [], governance = {}, reconciliation = {}) {
  return {
    simulation_total: simulations.length,
    simulated_ready_agents: simulations.filter((item) => item.execution_framing?.simulated_launch_posture === 'simulated_ready').length,
    governance_outcome: governance.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
    reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
    explainable: true,
  };
}

function buildAssistedExecutionLaunchSimulationLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
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

  const backendSimulation = buildLaunchSimulation(envelopes.backend_execution_envelope || {}, governance, 'backend');
  const iosSimulation = buildLaunchSimulation(envelopes.ios_execution_envelope || {}, governance, 'ios');
  const qaSimulation = buildLaunchSimulation(envelopes.qa_execution_envelope || {}, governance, 'qa');
  const simulations = [backendSimulation, iosSimulation, qaSimulation];
  const matrix = buildLaunchSimulationMatrix(simulations, governance, envelopes);
  const summary = buildLaunchSimulationSummary(simulations, governance, reconciliation);

  return {
    updatedAt,
    actor_role: actorRole,
    simulation_surface_kind: 'assisted-execution-launch-simulation',
    backend_launch_simulation: backendSimulation,
    ios_launch_simulation: iosSimulation,
    qa_launch_simulation: qaSimulation,
    launch_simulation_matrix: matrix,
    launch_simulation_summary: summary,
    launch_simulation_payload: {
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
      read_only: true,
      explainable: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionLaunchSimulationLayer,
  buildLaunchSimulation,
  buildLaunchSimulationMatrix,
  buildLaunchSimulationSummary,
};
