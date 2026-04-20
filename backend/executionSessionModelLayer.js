const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildExecutionSession(authorization = {}, actorRole = 'orchestrator', updatedAt = null) {
  const authorizedLanes = authorization.authorized_lanes || [];
  return {
    session_id: `exec-session-${String(updatedAt || Date.now()).replace(/[^0-9]/g, '').slice(0, 14)}`,
    session_kind: 'controlled_execution_session_model',
    actor_role: actorRole,
    created_at: updatedAt,
    authorized_lane_count: authorizedLanes.length,
    bounded_scope: authorization.execution_budget?.scope_units || 0,
    explicit_operator_control_required: true,
  };
}

function buildSessionLifecycleState(authorization = {}) {
  return {
    current_state: authorization.execution_authorization_outcome?.outcome === 'authorization_granted' ? 'authorized' : 'pending',
    allowed_transitions: ['pending', 'authorized', 'paused', 'cancelled', 'closed'],
    governed: true,
    explainable: true,
  };
}

function buildSessionLanes(authorization = {}, envelopes = {}) {
  return ['backend', 'ios', 'qa'].map((lane) => ({
    lane,
    enrolled: (authorization.authorized_lanes || []).includes(lane),
    envelope_scope: Array.isArray(envelopes[`${lane}_execution_envelope`]?.scope) ? envelopes[`${lane}_execution_envelope`].scope.length : 0,
    bounded: true,
  }));
}

function buildSessionControlState(lifecycle = {}, authorization = {}) {
  return {
    current_state: lifecycle.current_state || 'pending',
    pause_allowed: lifecycle.current_state === 'authorized',
    cancel_allowed: ['pending', 'authorized', 'paused'].includes(lifecycle.current_state),
    resume_allowed: lifecycle.current_state === 'paused',
    explicit_operator_control_required: authorization.operator_authorization_requirements?.explicit_operator_approval === true,
  };
}

function buildSessionAuditContext(authorization = {}, releaseDecision = {}, governance = {}, decision = {}, knowledge = {}) {
  return {
    authorization_outcome: authorization.execution_authorization_outcome?.outcome || 'authorization_withheld',
    release_decision_outcome: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
    governance_outcome: governance.governance_finalization_payload?.decision_outcome || 'dispatch_hold_decision',
    decision_owner: decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
    audit_ready: true,
    explainable: true,
  };
}

function buildExecutionSessionSummary(session = {}, lifecycle = {}, lanes = [], control = {}) {
  return {
    session_id: session.session_id || null,
    lifecycle_state: lifecycle.current_state || 'pending',
    enrolled_lane_count: lanes.filter((lane) => lane.enrolled).length,
    pause_allowed: control.pause_allowed === true,
    explainable: true,
  };
}

function buildExecutionSessionSummaryInputPack(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const knowledge = buildKnowledgeAwareContext(runtimeState, actorRole, { includeDecisionConsumer: false });
  const authorization = buildAssistedExecutionAuthorizationLayer(runtimeState, actorRole);
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(runtimeState, actorRole);
  const governanceOutcome = authorization.authorization_payload?.governance_outcome || releaseDecision.release_decision_payload?.governance_outcome || 'dispatch_hold_decision';
  const decisionOwner = authorization.authorization_payload?.decision_owner || releaseDecision.release_decision_payload?.decision_owner || knowledge.routing_summary?.suggested_owner || actorRole;
  const authorizedLanes = authorization.authorized_lanes || [];

  return {
    knowledge,
    authorization,
    releaseDecision,
    review: {
      release_posture: {
        posture: authorization.authorization_payload?.operator_release_posture || releaseDecision.release_decision_payload?.operator_release_posture || 'operator_review_hold',
      },
    },
    simulation: {
      launch_simulation_summary: {
        simulated_ready_agents: authorization.authorization_payload?.simulation_ready_agents || releaseDecision.release_decision_payload?.simulation_ready_agents || 0,
      },
    },
    envelopes: {
      execution_envelope_summary: {
        envelope_total: authorization.authorization_payload?.envelope_total || releaseDecision.release_decision_payload?.envelope_total || 0,
      },
      byLane: Object.fromEntries(['backend', 'ios', 'qa'].map((lane) => [
        `${lane}_execution_envelope`,
        { scope: authorizedLanes.includes(lane) ? [lane] : [] },
      ])),
    },
    contracts: {
      handoff_contract_summary: {
        contract_total: authorization.authorization_payload?.contract_total || releaseDecision.release_decision_payload?.contract_total || 0,
      },
    },
    reconciliation: {
      reconciliation_outcome: {
        outcome: authorization.authorization_payload?.reconciliation_outcome || releaseDecision.release_decision_payload?.reconciliation_outcome || 'lane_reconciliation_hold',
      },
    },
    laneHandoff: {
      lane_handoff_summary: {
        ready_lanes: authorization.authorization_payload?.lane_handoff_ready || releaseDecision.release_decision_payload?.lane_handoff_ready || 0,
      },
      lane_handoff_payload: {
        governance_outcome: governanceOutcome,
        decision_owner: decisionOwner,
      },
    },
    governanceOutcome,
    decisionOwner,
  };
}

function buildExecutionSessionModelLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || new Date().toISOString();
  const inputPack = buildExecutionSessionSummaryInputPack({ updatedAt, tasks }, actorRole);
  const { knowledge, authorization, releaseDecision, review, simulation, envelopes, contracts, reconciliation, laneHandoff, governanceOutcome, decisionOwner } = inputPack;

  const session = buildExecutionSession(authorization, actorRole, updatedAt);
  const lifecycle = buildSessionLifecycleState(authorization);
  const lanes = buildSessionLanes(authorization, envelopes.byLane || {});
  const control = buildSessionControlState(lifecycle, authorization);
  const audit = buildSessionAuditContext(
    authorization,
    releaseDecision,
    { governance_finalization_payload: { decision_outcome: governanceOutcome } },
    { planning_output: { suggested_owner: decisionOwner } },
    knowledge,
  );
  const summary = buildExecutionSessionSummary(session, lifecycle, lanes, control);

  return {
    updatedAt,
    actor_role: actorRole,
    session_model_kind: 'execution-session-model',
    execution_session: session,
    session_lifecycle_state: lifecycle,
    session_lanes: lanes,
    session_control_state: control,
    session_audit_context: audit,
    execution_session_summary: summary,
    execution_session_payload: {
      actor_role: actorRole,
      authorization_outcome: authorization.execution_authorization_outcome?.outcome || 'authorization_withheld',
      authorized_lanes: authorization.authorized_lanes || [],
      release_decision_outcome: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
      operator_release_posture: review.release_posture?.posture || 'operator_review_hold',
      simulation_ready_agents: simulation.launch_simulation_summary?.simulated_ready_agents || 0,
      envelope_total: envelopes.execution_envelope_summary?.envelope_total || 0,
      contract_total: contracts.handoff_contract_summary?.contract_total || 0,
      lane_handoff_ready: laneHandoff.lane_handoff_summary?.ready_lanes || 0,
      reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
      bounded_scope: true,
      governed: true,
      read_only: true,
      explainable: true,
    },
  };
}

module.exports = {
  buildExecutionSessionModelLayer,
  buildExecutionSession,
  buildSessionLifecycleState,
  buildSessionLanes,
  buildSessionControlState,
  buildSessionAuditContext,
  buildExecutionSessionSummary,
};
