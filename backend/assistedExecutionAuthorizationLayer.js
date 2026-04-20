const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildExecutionAuthorizationOutcome(releaseDecision = {}, gates = [], authorizedLanes = []) {
  const allPass = gates.every((gate) => gate.status === 'pass');
  return {
    outcome: allPass && authorizedLanes.length > 0 && releaseDecision.release_decision_outcome?.decision === 'release_ready_decision'
      ? 'authorization_granted'
      : 'authorization_withheld',
    reason: allPass ? 'release_decision_ready' : 'authorization_gates_not_satisfied',
    explainable: true,
  };
}

function buildAuthorizedLanes(releaseDecision = {}) {
  return (releaseDecision.per_agent_release_decision || [])
    .filter((item) => item.release_decision === 'release_ready')
    .map((item) => item.agent);
}

function buildExecutionAuthorizationGates(releaseDecision = {}, review = {}, reconciliation = {}) {
  return [
    {
      gate: 'release_decision_gate',
      status: releaseDecision.release_decision_outcome?.decision === 'release_ready_decision' ? 'pass' : 'hold',
      detail: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
    },
    {
      gate: 'operator_review_gate',
      status: review.release_posture?.posture === 'operator_review_ready' ? 'pass' : 'hold',
      detail: review.release_posture?.posture || 'operator_review_hold',
    },
    {
      gate: 'lane_reconciliation_gate',
      status: reconciliation.reconciliation_outcome?.outcome === 'lane_reconciliation_ready' ? 'pass' : 'hold',
      detail: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
    },
  ];
}

function buildExecutionBudget(authorizedLanes = [], envelopes = {}, fallbackScopeUnits = null) {
  const scopeUnits = authorizedLanes.reduce((sum, lane) => {
    const envelope = envelopes[`${lane}_execution_envelope`];
    return sum + (Array.isArray(envelope?.scope) ? envelope.scope.length : 0);
  }, 0) || Number(fallbackScopeUnits || 0);
  return {
    authorized_lane_count: authorizedLanes.length,
    scope_units: scopeUnits,
    execution_mode: 'bounded_controlled_execution',
    explicit_operator_control_required: true,
  };
}

function buildOperatorAuthorizationRequirements(gates = [], budget = {}, contracts = {}) {
  return {
    required_gate_passes: gates.filter((gate) => gate.status === 'pass').length,
    total_gates: gates.length,
    explicit_operator_approval: true,
    contract_total: contracts.handoff_contract_summary?.contract_total || 0,
    bounded_scope_units: budget.scope_units || 0,
  };
}

function buildAuthorizationSummary(outcome = {}, authorizedLanes = [], budget = {}) {
  return {
    authorization_outcome: outcome.outcome || 'authorization_withheld',
    authorized_lane_count: authorizedLanes.length,
    scope_units: budget.scope_units || 0,
    explainable: true,
  };
}

function buildAuthorizationSummaryInputPack(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const knowledge = buildKnowledgeAwareContext(runtimeState, actorRole, { includeDecisionConsumer: false });
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(runtimeState, actorRole);
  const simulatedReadyAgents = releaseDecision.release_decision_payload?.simulation_ready_agents || 0;
  const envelopeTotal = releaseDecision.release_decision_payload?.envelope_total || 0;
  const contractTotal = releaseDecision.release_decision_payload?.contract_total || 0;
  const laneHandoffReady = releaseDecision.release_decision_payload?.lane_handoff_ready || 0;
  const reconciliationOutcome = releaseDecision.release_decision_payload?.reconciliation_outcome || 'lane_reconciliation_hold';
  const operatorReleasePosture = releaseDecision.release_decision_payload?.operator_release_posture || 'operator_review_hold';
  const governanceOutcome = releaseDecision.release_decision_payload?.governance_outcome || 'dispatch_hold_decision';
  const decisionOwner = releaseDecision.release_decision_payload?.decision_owner || knowledge.routing_summary?.suggested_owner || actorRole;
  const authorizedLanes = (releaseDecision.per_agent_release_decision || []).filter((item) => item.release_decision === 'release_ready').map((item) => item.agent);
  const scopeUnits = tasks.reduce((sum, task) => {
    const approvalPending = String(task.approval_state || '').toLowerCase() === 'approval_pending';
    const escalated = String(task.assignment_state || '').toLowerCase() === 'escalated';
    return sum + (approvalPending || escalated ? 0 : 1);
  }, 0);

  return {
    knowledge,
    releaseDecision,
    review: {
      release_posture: {
        posture: operatorReleasePosture,
      },
      operator_release_review_payload: {
        decision_owner: decisionOwner,
      },
    },
    simulation: {
      launch_simulation_summary: {
        simulated_ready_agents: simulatedReadyAgents,
      },
    },
    envelopes: {
      execution_envelope_summary: {
        envelope_total: envelopeTotal,
      },
      byLane: Object.fromEntries(['backend', 'ios', 'qa'].map((lane) => [
        `${lane}_execution_envelope`,
        { scope: authorizedLanes.includes(lane) ? [lane] : [] },
      ])),
    },
    contracts: {
      handoff_contract_summary: {
        contract_total: contractTotal,
      },
      handoff_contract_payload: {
        governance_outcome: governanceOutcome,
        decision_owner: decisionOwner,
      },
    },
    reconciliation: {
      reconciliation_outcome: {
        outcome: reconciliationOutcome,
      },
    },
    laneHandoff: {
      lane_handoff_summary: {
        ready_lanes: laneHandoffReady,
      },
      lane_handoff_payload: {
        governance_outcome: governanceOutcome,
        decision_owner: decisionOwner,
      },
    },
    authorizationBudgetScopeUnits: scopeUnits,
  };
}

function buildAssistedExecutionAuthorizationLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const inputPack = buildAuthorizationSummaryInputPack({ updatedAt, tasks }, actorRole);
  const { knowledge, releaseDecision, review, simulation, envelopes, contracts, reconciliation, laneHandoff, authorizationBudgetScopeUnits } = inputPack;
  const governanceOutcome = releaseDecision.release_decision_payload?.governance_outcome || contracts.handoff_contract_payload?.governance_outcome || laneHandoff.lane_handoff_payload?.governance_outcome || 'dispatch_hold_decision';
  const decisionOwner = releaseDecision.release_decision_payload?.decision_owner || review.operator_release_review_payload?.decision_owner || contracts.handoff_contract_payload?.decision_owner || laneHandoff.lane_handoff_payload?.decision_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator';

  const authorizedLanes = buildAuthorizedLanes(releaseDecision);
  const gates = buildExecutionAuthorizationGates(releaseDecision, review, reconciliation);
  const budget = buildExecutionBudget(authorizedLanes, envelopes.byLane || {}, authorizationBudgetScopeUnits);
  const requirements = buildOperatorAuthorizationRequirements(gates, budget, contracts);
  const outcome = buildExecutionAuthorizationOutcome(releaseDecision, gates, authorizedLanes);
  const summary = buildAuthorizationSummary(outcome, authorizedLanes, budget);

  return {
    updatedAt,
    actor_role: actorRole,
    authorization_surface_kind: 'assisted-execution-authorization',
    execution_authorization_outcome: outcome,
    authorized_lanes: authorizedLanes,
    execution_authorization_gates: gates,
    execution_budget: budget,
    operator_authorization_requirements: requirements,
    authorization_summary: summary,
    authorization_payload: {
      actor_role: actorRole,
      release_decision_outcome: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
      operator_release_posture: review.release_posture?.posture || 'operator_review_hold',
      simulation_ready_agents: simulation.launch_simulation_summary?.simulated_ready_agents || 0,
      envelope_total: envelopes.execution_envelope_summary?.envelope_total || 0,
      contract_total: contracts.handoff_contract_summary?.contract_total || 0,
      lane_handoff_ready: laneHandoff.lane_handoff_summary?.ready_lanes || 0,
      reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
      governance_outcome: governanceOutcome,
      decision_owner: decisionOwner,
      bounded_scope: true,
      read_only: true,
      explainable: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionAuthorizationLayer,
  buildExecutionAuthorizationOutcome,
  buildAuthorizedLanes,
  buildExecutionAuthorizationGates,
  buildExecutionBudget,
  buildOperatorAuthorizationRequirements,
  buildAuthorizationSummary,
};
