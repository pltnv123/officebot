const { buildExecutorCoordinationDecisionPolicyLayer } = require('./executorCoordinationDecisionPolicyLayer');
const { buildExecutorCoordinationStateTransitionsLayer } = require('./executorCoordinationStateTransitionsLayer');
const { buildExecutorCoordinationActionsLayer } = require('./executorCoordinationActionsLayer');
const { buildExecutorOrchestrationLoopLayer } = require('./executorOrchestrationLoopLayer');
const { buildBackendExecutorRuntimeLayer } = require('./backendExecutorRuntimeLayer');
const { buildIosExecutorRuntimeLayer } = require('./iosExecutorRuntimeLayer');
const { buildQaExecutorRuntimeLayer } = require('./qaExecutorRuntimeLayer');
const { buildLaneExecutorRuntimeContractsLayer } = require('./laneExecutorRuntimeContractsLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

const LANES = ['backend', 'ios', 'qa'];

function buildExecutionGateOutcome(lane, policyDecision = {}, orchestration = {}, runtime = {}, contract = {}, session = {}, authorization = {}, releaseDecision = {}) {
  const loopState = orchestration.orchestration_loop_state || {};
  const selectedAction = policyDecision.selected_action || 'request_operator_checkpoint';
  const selectedTransition = policyDecision.selected_transition || 'checkpoint_to_hold';
  const authorizationOutcome = authorization.execution_authorization_outcome?.outcome || 'authorization_withheld';
  const releaseOutcome = releaseDecision.release_decision_outcome?.decision || 'release_hold_decision';
  const sessionState = session.session_lifecycle_state?.current_state || 'pending';
  const runtimeSummary = runtime[`${lane}_runtime_summary`] || {};
  const activeLane = loopState.active_lane || null;
  const laneOrderGateOpen = lane === activeLane || activeLane === null;
  const resultCollected = runtimeSummary.last_result_status === 'collected' || runtimeSummary.result_collection_state === 'collected';
  const authorized = authorizationOutcome === 'authorization_granted';
  const releaseGo = releaseOutcome === 'release_go_decision';
  const sessionActive = sessionState === 'active_governed_session';
  const explicitOperatorControl = contract.constraints?.explicit_operator_control_required === true;

  let gateCategory = 'hold_on_policy_guardrail_violation';
  let gateOutcome = 'hold';
  let gateReason = 'Execution gate remains held until governed prerequisites align.';

  if (!authorized) {
    gateCategory = 'force_noop_when_execution_not_authorized';
    gateOutcome = 'deny';
    gateReason = 'Execution is not authorized, so selected coordinator progression is reduced to no-op.';
  } else if (!releaseGo || !sessionActive) {
    gateCategory = 'require_operator_checkpoint_before_advance';
    gateOutcome = 'hold';
    gateReason = 'Operator checkpoint is required before any coordinator-selected advance can proceed.';
  } else if (!laneOrderGateOpen) {
    gateCategory = 'preserve_lane_order_gate';
    gateOutcome = 'hold';
    gateReason = 'Lane execution order is preserved, so non-active lanes remain held.';
  } else if (resultCollected) {
    gateCategory = 'hold_until_result_collection';
    gateOutcome = 'hold';
    gateReason = 'Lane stays held until result collection completes and next governed checkpoint is established.';
  } else if (selectedAction === 'advance_lane_stage' && selectedTransition === 'checkpoint_to_advance' && explicitOperatorControl) {
    gateCategory = 'allow_ready_lane_progression';
    gateOutcome = 'allow';
    gateReason = 'Governed progression is allowed for the active lane under explicit operator-controlled execution boundaries.';
  } else if (selectedAction === 'request_operator_checkpoint' || selectedAction === 'hold_lane') {
    gateCategory = 'allow_guarded_checkpoint';
    gateOutcome = 'hold';
    gateReason = 'Coordinator policy stays at a guarded checkpoint without starting uncontrolled execution.';
  }

  return {
    lane,
    execution_gate_kind: 'guarded_coordination_execution_gate',
    selected_action: selectedAction,
    selected_transition: selectedTransition,
    gate_category: gateCategory,
    gate_outcome: gateOutcome,
    gate_reason: gateReason,
    active_lane: activeLane,
    execution_mode: runtimeSummary.execution_mode || 'authorization_hold',
    explicit_operator_control: explicitOperatorControl,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildExecutionGatePreconditions(outcomes = [], orchestration = {}, session = {}, authorization = {}, releaseDecision = {}) {
  const loopMode = orchestration.orchestration_loop_state?.loop_mode || 'governed_hold';
  const sessionState = session.session_lifecycle_state?.current_state || 'pending';
  const authorizationOutcome = authorization.execution_authorization_outcome?.outcome || 'authorization_withheld';
  const releaseOutcome = releaseDecision.release_decision_outcome?.decision || 'release_hold_decision';

  return outcomes.map((outcome) => ({
    lane: outcome.lane,
    preconditions: [
      { condition: 'session_active', status: sessionState === 'active_governed_session' ? 'pass' : 'hold', detail: sessionState },
      { condition: 'authorization_granted', status: authorizationOutcome === 'authorization_granted' ? 'pass' : 'deny', detail: authorizationOutcome },
      { condition: 'release_go', status: releaseOutcome === 'release_go_decision' ? 'pass' : 'hold', detail: releaseOutcome },
      { condition: 'preserve_lane_order', status: outcome.lane === outcome.active_lane || outcome.active_lane === null ? 'pass' : 'hold', detail: outcome.active_lane || 'unassigned' },
      { condition: 'loop_progression_ready', status: loopMode === 'staged_progression_ready' ? 'pass' : 'hold', detail: loopMode },
    ],
  }));
}

function buildExecutionGateGuardrails(outcomes = [], policy = {}, actions = {}, transitions = {}, orchestration = {}) {
  const holdGates = (orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate);
  return outcomes.map((outcome) => ({
    lane: outcome.lane,
    guardrails: {
      read_only_default: true,
      no_hidden_repo_mutations: true,
      no_uncontrolled_execution: true,
      explicit_allow_hold_deny_only: true,
      snapshot_safe_state_api: true,
      websocket_not_source_of_truth: true,
      runtime_source_of_truth: 'supabase',
      policy_surface_kind: policy.executor_coordination_decision_policy?.policy_surface_kind || 'controlled_executor_coordination_decision_policy',
      action_surface_kind: actions.executor_coordination_actions?.action_surface_kind || 'controlled_executor_coordination_actions',
      transition_surface_kind: transitions.executor_coordination_state_transitions?.transition_surface_kind || 'controlled_executor_coordination_state_transitions',
      hold_gates: holdGates,
    },
  }));
}

function buildExecutionGateSummary(outcomes = [], orchestration = {}) {
  return {
    lane_total: outcomes.length,
    allow_total: outcomes.filter((outcome) => outcome.gate_outcome === 'allow').length,
    hold_total: outcomes.filter((outcome) => outcome.gate_outcome === 'hold').length,
    deny_total: outcomes.filter((outcome) => outcome.gate_outcome === 'deny').length,
    loop_mode: orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    explainable: true,
  };
}

function buildExecutionGatePayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    loop_mode: input.orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    active_lane: input.orchestration.orchestration_loop_state?.active_lane || null,
    gate_outcomes_by_lane: Object.fromEntries((input.outcomes || []).map((outcome) => [
      outcome.lane,
      {
        gate_category: outcome.gate_category,
        gate_outcome: outcome.gate_outcome,
        selected_action: outcome.selected_action,
        selected_transition: outcome.selected_transition,
      },
    ])),
    hold_gates: (input.orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate),
    bounded_for_future_gate_engine: true,
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildExecutorCoordinationExecutionGateLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const authorization = buildAssistedExecutionAuthorizationLayer(baseRuntime, actorRole);
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(baseRuntime, actorRole);
  const contracts = buildLaneExecutorRuntimeContractsLayer(baseRuntime, actorRole);
  const orchestration = buildExecutorOrchestrationLoopLayer(baseRuntime, actorRole);
  const actions = buildExecutorCoordinationActionsLayer(baseRuntime, actorRole);
  const transitions = buildExecutorCoordinationStateTransitionsLayer(baseRuntime, actorRole);
  const policy = buildExecutorCoordinationDecisionPolicyLayer(baseRuntime, actorRole);
  const backendRuntime = buildBackendExecutorRuntimeLayer(baseRuntime, actorRole);
  const iosRuntime = buildIosExecutorRuntimeLayer(baseRuntime, actorRole);
  const qaRuntime = buildQaExecutorRuntimeLayer(baseRuntime, actorRole);

  const runtimes = { backend: backendRuntime, ios: iosRuntime, qa: qaRuntime };
  const policyByLane = Object.fromEntries((policy.policy_decision_catalog || []).map((item) => [item.lane, item]));
  const executionGateOutcome = LANES.map((lane) => buildExecutionGateOutcome(
    lane,
    policyByLane[lane] || {},
    orchestration,
    runtimes[lane],
    contracts[`${lane}_runtime_contract`] || {},
    session,
    authorization,
    releaseDecision,
  ));
  const executionGatePreconditions = buildExecutionGatePreconditions(executionGateOutcome, orchestration, session, authorization, releaseDecision);
  const executionGateGuardrails = buildExecutionGateGuardrails(executionGateOutcome, policy, actions, transitions, orchestration);
  const executionGateSummary = buildExecutionGateSummary(executionGateOutcome, orchestration);
  const executionGatePayload = buildExecutionGatePayload({
    actorRole,
    session,
    decisionAssistance,
    knowledge,
    orchestration,
    outcomes: executionGateOutcome,
  });

  return {
    updatedAt,
    actor_role: actorRole,
    gate_surface_kind: 'executor-coordination-execution-gate',
    executor_coordination_execution_gate: {
      gate_surface_kind: 'controlled_executor_coordination_execution_gate',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      orchestration_loop_state: orchestration.orchestration_loop_state,
      policy_decision_summary: policy.policy_decision_summary,
      coordination_actions_summary: actions.coordination_actions_summary,
      state_progression_summary: transitions.state_progression_summary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    execution_gate_outcome: executionGateOutcome,
    execution_gate_preconditions: executionGatePreconditions,
    execution_gate_guardrails: executionGateGuardrails,
    execution_gate_summary: executionGateSummary,
    execution_gate_payload: executionGatePayload,
  };
}

module.exports = {
  buildExecutorCoordinationExecutionGateLayer,
  buildExecutionGateOutcome,
  buildExecutionGatePreconditions,
  buildExecutionGateGuardrails,
  buildExecutionGateSummary,
  buildExecutionGatePayload,
};
