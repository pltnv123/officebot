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

function buildExecutionEnvelope(contract = {}, governance = {}, reconciliation = {}, agent = 'backend') {
  return {
    agent,
    envelope_kind: 'read_only_execution_envelope',
    scope: contract.task_framing || [],
    dependencies: contract.dependencies || [],
    blockers: contract.blockers || [],
    readiness_assumptions: {
      handoff_ready: contract.readiness_assumptions?.handoff_ready === true,
      reconciliation_ready: contract.readiness_assumptions?.reconciliation_ready === true,
      governance_release_readiness: contract.readiness_assumptions?.governance_release_readiness || 'not_ready_for_handoff_surface',
    },
    contract_boundaries: contract.contract_boundaries || {
      read_only: true,
      no_execution_side_effects: true,
      no_queue_mutation: true,
      no_agent_activation: true,
    },
    execution_framing: {
      governance_outcome: governance.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
      reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
      explainable: true,
    },
  };
}

function buildExecutionEnvelopeMatrix(envelopes = [], governance = {}, contracts = {}) {
  return envelopes.map((envelope) => ({
    agent: envelope.agent,
    envelope_kind: envelope.envelope_kind,
    governance_outcome: governance.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
    contract_kind: contracts[`${envelope.agent}_handoff_contract`]?.contract_kind || 'read_only_handoff_contract',
    scope_count: Array.isArray(envelope.scope) ? envelope.scope.length : 0,
    blocker_count: Array.isArray(envelope.blockers) ? envelope.blockers.length : 0,
  }));
}

function buildExecutionEnvelopeSummary(envelopes = [], reconciliation = {}) {
  return {
    envelope_total: envelopes.length,
    ready_envelopes: envelopes.filter((item) => item.readiness_assumptions?.handoff_ready === true).length,
    reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
    explainable: true,
  };
}

function buildAssistedExecutionEnvelopeLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
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

  const backendEnvelope = buildExecutionEnvelope(contracts.backend_handoff_contract || {}, governance, reconciliation, 'backend');
  const iosEnvelope = buildExecutionEnvelope(contracts.ios_handoff_contract || {}, governance, reconciliation, 'ios');
  const qaEnvelope = buildExecutionEnvelope(contracts.qa_handoff_contract || {}, governance, reconciliation, 'qa');
  const envelopes = [backendEnvelope, iosEnvelope, qaEnvelope];
  const matrix = buildExecutionEnvelopeMatrix(envelopes, governance, contracts);
  const summary = buildExecutionEnvelopeSummary(envelopes, reconciliation);

  return {
    updatedAt,
    actor_role: actorRole,
    envelope_surface_kind: 'assisted-execution-envelope',
    backend_execution_envelope: backendEnvelope,
    ios_execution_envelope: iosEnvelope,
    qa_execution_envelope: qaEnvelope,
    execution_envelope_matrix: matrix,
    execution_envelope_summary: summary,
    execution_envelope_payload: {
      actor_role: actorRole,
      governance_outcome: governance.governance_finalization_payload?.decision_outcome || 'dispatch_hold_decision',
      dispatch_outcome: dispatchDecision.decision_payload?.outcome || 'dispatch_hold_decision',
      activation_review_decision: activationReview.recommended_activation_review_decision?.decision || 'review_hold',
      advisory_recommendation: advisory.advisory_payload?.recommendation || 'hold',
      preflight_status: preflight.dispatch_start_recommendation?.status || 'hold',
      coordination_owner: coordination.coordination_payload?.suggested_owner || 'orchestrator',
      readiness_status: readiness.dispatch_go_no_go_summary?.status || 'hold',
      decision_owner: decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
      lane_handoff_ready: laneHandoff.lane_handoff_summary?.ready_lanes || 0,
      reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
      read_only: true,
      explainable: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionEnvelopeLayer,
  buildExecutionEnvelope,
  buildExecutionEnvelopeMatrix,
  buildExecutionEnvelopeSummary,
};
