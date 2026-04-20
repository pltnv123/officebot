const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

const LANE_ORDER = ['backend', 'ios', 'qa'];

function buildLaneAllowedActions(lane) {
  if (lane === 'backend') return ['analyze_backend_scope', 'prepare_backend_patch', 'report_backend_artifacts'];
  if (lane === 'ios') return ['analyze_ios_scope', 'prepare_ios_patch', 'report_ios_artifacts'];
  return ['design_verification_plan', 'collect_execution_evidence', 'report_verification_outcome'];
}

function buildLaneConstraints(lane, authorization = {}, envelope = {}) {
  return {
    lane,
    governed: true,
    explicit_operator_control_required: authorization.operator_authorization_requirements?.explicit_operator_approval === true,
    read_only_runtime_contract: true,
    no_uncontrolled_execution: true,
    supabase_runtime_source_of_truth: true,
    api_state_snapshot_safe: true,
    websocket_not_source_of_truth: true,
    scope_count: Array.isArray(envelope.scope) ? envelope.scope.length : 0,
  };
}

function buildFailureSemantics(lane, envelope = {}, reconciliation = {}) {
  const blockerCount = Array.isArray(envelope.blockers) ? envelope.blockers.length : 0;
  return {
    lane,
    timeout_expectation: lane === 'qa' ? 'bounded_verification_window' : 'bounded_execution_window',
    retry_framing: blockerCount > 0 ? 'retry_only_after_operator_reconciliation' : 'retry_under_governed_operator_control',
    failure_mode: blockerCount > 0 ? 'blocked_before_executor_start' : 'bounded_failure_report_required',
    reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
    explainable: true,
  };
}

function buildLaneRuntimeContract(lane, context = {}) {
  const envelope = context.envelopes?.[`${lane}_execution_envelope`] || {};
  const handoffContract = context.contracts?.[`${lane}_handoff_contract`] || {};
  const sessionLane = (context.session?.session_lanes || []).find((entry) => entry.lane === lane) || {};
  const authorized = Array.isArray(context.authorization?.authorized_lanes)
    ? context.authorization.authorized_lanes.includes(lane)
    : false;

  return {
    lane,
    contract_kind: 'lane_executor_runtime_contract',
    authorized,
    session_enrolled: sessionLane.enrolled === true,
    allowed_actions: buildLaneAllowedActions(lane),
    constraints: buildLaneConstraints(lane, context.authorization, envelope),
    boundaries: {
      no_real_execution_start: true,
      no_queue_mutation: true,
      no_hidden_side_effects: true,
      operator_pause_cancel_retry_only: true,
    },
    failure_semantics: buildFailureSemantics(lane, envelope, context.reconciliation),
    timeout_expectations: {
      contract_timeout: 'governed_runtime_contract_only',
      operator_review_required_on_timeout: true,
    },
    runtime_inputs: {
      execution_session_id: context.session?.execution_session?.session_id || null,
      release_decision: context.releaseDecision?.release_decision_outcome?.decision || 'release_hold_decision',
      operator_release_posture: context.review?.release_posture?.posture || 'operator_review_hold',
      governance_outcome: context.governance?.governance_decision_outcome?.decision_outcome || 'dispatch_hold_decision',
      lane_handoff_ready: context.laneHandoff?.lane_handoff_summary?.ready_lanes || 0,
      reconciliation_outcome: context.reconciliation?.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
      handoff_contract_kind: handoffContract.contract_kind || 'read_only_handoff_contract',
      envelope_kind: envelope.envelope_kind || 'read_only_execution_envelope',
      runtime_source: 'supabase',
    },
    executable_payload: {
      lane,
      scope: envelope.scope || [],
      dependencies: envelope.dependencies || [],
      blockers: envelope.blockers || [],
      allowed_actions: buildLaneAllowedActions(lane),
      read_only: true,
      governed: true,
      bounded: true,
    },
  };
}

function buildRuntimeContractMatrix(contracts = [], session = {}, authorization = {}) {
  return contracts.map((contract) => ({
    lane: contract.lane,
    authorized: contract.authorized,
    session_enrolled: contract.session_enrolled,
    allowed_action_count: Array.isArray(contract.allowed_actions) ? contract.allowed_actions.length : 0,
    scope_count: contract.constraints?.scope_count || 0,
    explicit_operator_control_required: authorization.operator_authorization_requirements?.explicit_operator_approval === true,
    session_state: session.session_lifecycle_state?.current_state || 'pending',
  }));
}

function buildRuntimeContractSummary(contracts = [], session = {}, authorization = {}, releaseDecision = {}) {
  return {
    contract_total: contracts.length,
    authorized_contracts: contracts.filter((contract) => contract.authorized).length,
    enrolled_contracts: contracts.filter((contract) => contract.session_enrolled).length,
    execution_session_state: session.session_lifecycle_state?.current_state || 'pending',
    release_decision: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
    authorized_lane_count: Array.isArray(authorization.authorized_lanes) ? authorization.authorized_lanes.length : 0,
    explainable: true,
  };
}

function buildRuntimeContractPayload(context = {}, summary = {}) {
  return {
    actor_role: context.actorRole,
    execution_session_id: context.session?.execution_session?.session_id || null,
    authorization_outcome: context.authorization?.execution_authorization_outcome?.outcome || 'authorization_withheld',
    release_decision: context.releaseDecision?.release_decision_outcome?.decision || 'release_hold_decision',
    operator_release_posture: context.review?.release_posture?.posture || 'operator_review_hold',
    simulation_ready_agents: context.simulation?.launch_simulation_summary?.simulated_ready_agents || 0,
    lane_handoff_ready: context.laneHandoff?.lane_handoff_summary?.ready_lanes || 0,
    reconciliation_outcome: context.reconciliation?.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
    governance_outcome: context.governance?.governance_finalization_payload?.decision_outcome || 'dispatch_hold_decision',
    decision_owner: context.decision?.planning_output?.suggested_owner || context.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    authorized_contracts: summary.authorized_contracts || 0,
    runtime_source: 'supabase',
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildRuntimeContractsSummaryInputPack(runtimeState = {}, actorRole = 'orchestrator') {
  const knowledge = buildKnowledgeAwareContext(runtimeState, actorRole, { includeDecisionConsumer: false });
  const session = buildExecutionSessionModelLayer(runtimeState, actorRole);
  const authorization = buildAssistedExecutionAuthorizationLayer(runtimeState, actorRole);
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(runtimeState, actorRole);
  const governanceOutcome = session.session_audit_context?.governance_outcome || authorization.authorization_payload?.governance_outcome || releaseDecision.release_decision_payload?.governance_outcome || 'dispatch_hold_decision';
  const decisionOwner = session.session_audit_context?.decision_owner || authorization.authorization_payload?.decision_owner || releaseDecision.release_decision_payload?.decision_owner || knowledge.routing_summary?.suggested_owner || actorRole;
  const authorizedLanes = authorization.authorized_lanes || [];

  return {
    knowledge,
    session,
    authorization,
    releaseDecision,
    review: {
      release_posture: {
        posture: session.execution_session_payload?.operator_release_posture || authorization.authorization_payload?.operator_release_posture || releaseDecision.release_decision_payload?.operator_release_posture || 'operator_review_hold',
      },
    },
    simulation: {
      launch_simulation_summary: {
        simulated_ready_agents: session.execution_session_payload?.simulation_ready_agents || authorization.authorization_payload?.simulation_ready_agents || releaseDecision.release_decision_payload?.simulation_ready_agents || 0,
      },
    },
    envelopes: Object.fromEntries(['backend', 'ios', 'qa'].map((lane) => [
      `${lane}_execution_envelope`,
      {
        envelope_kind: 'read_only_execution_envelope',
        scope: authorizedLanes.includes(lane) ? [lane] : [],
        dependencies: [],
        blockers: authorizedLanes.includes(lane) ? [] : ['not_authorized_for_execution'],
      },
    ])),
    contracts: Object.fromEntries(['backend', 'ios', 'qa'].map((lane) => [
      `${lane}_handoff_contract`,
      {
        contract_kind: 'read_only_handoff_contract',
      },
    ])),
    reconciliation: {
      reconciliation_outcome: {
        outcome: session.execution_session_payload?.reconciliation_outcome || authorization.authorization_payload?.reconciliation_outcome || releaseDecision.release_decision_payload?.reconciliation_outcome || 'lane_reconciliation_hold',
      },
    },
    laneHandoff: {
      lane_handoff_summary: {
        ready_lanes: session.execution_session_payload?.lane_handoff_ready || authorization.authorization_payload?.lane_handoff_ready || releaseDecision.release_decision_payload?.lane_handoff_ready || 0,
      },
    },
    governance: {
      governance_finalization_payload: {
        decision_outcome: governanceOutcome,
      },
      governance_decision_outcome: {
        decision_outcome: governanceOutcome,
      },
    },
    decision: {
      planning_output: {
        suggested_owner: decisionOwner,
      },
    },
  };
}

function buildLaneExecutorRuntimeContractsLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || new Date().toISOString();

  const inputPack = buildRuntimeContractsSummaryInputPack({ updatedAt, tasks }, actorRole);
  const context = {
    actorRole,
    session: inputPack.session,
    authorization: inputPack.authorization,
    releaseDecision: inputPack.releaseDecision,
    review: inputPack.review,
    simulation: inputPack.simulation,
    envelopes: inputPack.envelopes,
    contracts: inputPack.contracts,
    reconciliation: inputPack.reconciliation,
    laneHandoff: inputPack.laneHandoff,
    governance: inputPack.governance,
    decision: inputPack.decision,
    knowledge: inputPack.knowledge,
  };

  const laneContracts = LANE_ORDER.map((lane) => buildLaneRuntimeContract(lane, context));
  const matrix = buildRuntimeContractMatrix(laneContracts, context.session, context.authorization);
  const summary = buildRuntimeContractSummary(laneContracts, context.session, context.authorization, context.releaseDecision);
  const payload = buildRuntimeContractPayload(context, summary);

  return {
    updatedAt,
    actor_role: actorRole,
    runtime_contract_kind: 'lane-executor-runtime-contracts',
    backend_runtime_contract: laneContracts.find((item) => item.lane === 'backend') || null,
    ios_runtime_contract: laneContracts.find((item) => item.lane === 'ios') || null,
    qa_runtime_contract: laneContracts.find((item) => item.lane === 'qa') || null,
    runtime_contract_matrix: matrix,
    runtime_contract_summary: summary,
    runtime_contract_payload: payload,
  };
}

module.exports = {
  buildLaneExecutorRuntimeContractsLayer,
  buildLaneRuntimeContract,
  buildRuntimeContractMatrix,
  buildRuntimeContractSummary,
  buildRuntimeContractPayload,
};
