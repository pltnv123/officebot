const { buildExecutorCoordinationExecutionGateLayer } = require('./executorCoordinationExecutionGateLayer');
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

const INTERVENTION_CATEGORIES = [
  'request_operator_checkpoint',
  'pause_coordinator_flow',
  'hold_selected_lane',
  'resume_guarded_progression',
  'cancel_pending_progression',
  'request_result_review',
  'require_manual_gate_confirmation',
];

const LANES = ['backend', 'ios', 'qa'];

function buildInterventionActions(lane, gate = {}, policy = {}, runtime = {}, orchestration = {}, contract = {}) {
  const loopState = orchestration.orchestration_loop_state || {};
  const runtimeSummary = runtime[`${lane}_runtime_summary`] || {};
  const activeLane = loopState.active_lane || null;
  const gateOutcome = gate.gate_outcome || 'hold';
  const gateCategory = gate.gate_category || 'hold_on_policy_guardrail_violation';
  const selectedAction = policy.selected_action || 'request_operator_checkpoint';

  return {
    lane,
    intervention_action_kind: 'guarded_operator_intervention_actions',
    actions: INTERVENTION_CATEGORIES.map((action) => ({
      action,
      lane,
      available: action === 'request_operator_checkpoint'
        || action === 'require_manual_gate_confirmation'
        || (action === 'pause_coordinator_flow' ? gateOutcome !== 'deny' : true)
        || (action === 'hold_selected_lane' ? lane === activeLane || activeLane === null : true)
        || (action === 'resume_guarded_progression' ? gateOutcome === 'allow' && selectedAction === 'advance_lane_stage' : true)
        || (action === 'cancel_pending_progression' ? gateCategory !== 'force_noop_when_execution_not_authorized' : true)
        || (action === 'request_result_review' ? runtimeSummary.result_collection_state === 'collected' || runtimeSummary.last_result_status === 'collected' : true),
      mode: action === 'resume_guarded_progression' ? 'guarded' : 'staged',
      governed: true,
      read_only: true,
    })),
    gate_outcome: gateOutcome,
    gate_category: gateCategory,
    active_lane: activeLane,
    explicit_operator_control: contract.constraints?.explicit_operator_control_required === true,
    explainable: true,
  };
}

function buildInterventionPreconditions(interventions = [], orchestration = {}, session = {}, authorization = {}, releaseDecision = {}) {
  const loopMode = orchestration.orchestration_loop_state?.loop_mode || 'governed_hold';
  const sessionState = session.session_lifecycle_state?.current_state || 'pending';
  const authorizationOutcome = authorization.execution_authorization_outcome?.outcome || 'authorization_withheld';
  const releaseOutcome = releaseDecision.release_decision_outcome?.decision || 'release_hold_decision';

  return interventions.map((item) => ({
    lane: item.lane,
    preconditions: [
      { condition: 'session_visible_to_operator', status: sessionState ? 'pass' : 'hold', detail: sessionState },
      { condition: 'authorization_context_available', status: authorizationOutcome ? 'pass' : 'hold', detail: authorizationOutcome },
      { condition: 'release_context_available', status: releaseOutcome ? 'pass' : 'hold', detail: releaseOutcome },
      { condition: 'loop_context_available', status: loopMode ? 'pass' : 'hold', detail: loopMode },
      { condition: 'manual_gate_required_for_resume', status: item.gate_outcome === 'allow' ? 'pass' : 'hold', detail: item.gate_outcome },
    ],
  }));
}

function buildInterventionGuardrails(interventions = [], gateLayer = {}, policyLayer = {}, actionsLayer = {}, transitionsLayer = {}, orchestration = {}) {
  const holdGates = (orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate);
  return interventions.map((item) => ({
    lane: item.lane,
    guardrails: {
      read_only_default: true,
      staged_interventions_only: true,
      bounded_pause_hold_resume_cancel_scope: true,
      no_hidden_repo_mutations: true,
      no_uncontrolled_execution: true,
      snapshot_safe_state_api: true,
      websocket_not_source_of_truth: true,
      runtime_source_of_truth: 'supabase',
      execution_gate_surface_kind: gateLayer.executor_coordination_execution_gate?.gate_surface_kind || 'controlled_executor_coordination_execution_gate',
      policy_surface_kind: policyLayer.executor_coordination_decision_policy?.policy_surface_kind || 'controlled_executor_coordination_decision_policy',
      action_surface_kind: actionsLayer.executor_coordination_actions?.action_surface_kind || 'controlled_executor_coordination_actions',
      transition_surface_kind: transitionsLayer.executor_coordination_state_transitions?.transition_surface_kind || 'controlled_executor_coordination_state_transitions',
      hold_gates: holdGates,
    },
  }));
}

function buildInterventionSummary(interventions = [], orchestration = {}) {
  const actionTotal = interventions.reduce((sum, item) => sum + (item.actions || []).length, 0);
  const availableTotal = interventions.reduce((sum, item) => sum + (item.actions || []).filter((action) => action.available).length, 0);
  return {
    lane_total: interventions.length,
    intervention_action_total: actionTotal,
    available_intervention_total: availableTotal,
    loop_mode: orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    explainable: true,
  };
}

function buildInterventionPayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    loop_mode: input.orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    active_lane: input.orchestration.orchestration_loop_state?.active_lane || null,
    intervention_actions_by_lane: Object.fromEntries((input.interventions || []).map((item) => [
      item.lane,
      (item.actions || []).filter((action) => action.available).map((action) => action.action),
    ])),
    hold_gates: (input.orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate),
    bounded_for_future_operator_control_path: true,
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildOperatorInterventionControlLayer(runtimeState = {}, actorRole = 'orchestrator') {
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
  const actionsLayer = buildExecutorCoordinationActionsLayer(baseRuntime, actorRole);
  const transitionsLayer = buildExecutorCoordinationStateTransitionsLayer(baseRuntime, actorRole);
  const policyLayer = buildExecutorCoordinationDecisionPolicyLayer(baseRuntime, actorRole);
  const gateLayer = buildExecutorCoordinationExecutionGateLayer(baseRuntime, actorRole);
  const backendRuntime = buildBackendExecutorRuntimeLayer(baseRuntime, actorRole);
  const iosRuntime = buildIosExecutorRuntimeLayer(baseRuntime, actorRole);
  const qaRuntime = buildQaExecutorRuntimeLayer(baseRuntime, actorRole);

  const runtimes = { backend: backendRuntime, ios: iosRuntime, qa: qaRuntime };
  const policyByLane = Object.fromEntries((policyLayer.policy_decision_catalog || []).map((item) => [item.lane, item]));
  const gateByLane = Object.fromEntries((gateLayer.execution_gate_outcome || []).map((item) => [item.lane, item]));
  const interventionActions = LANES.map((lane) => buildInterventionActions(
    lane,
    gateByLane[lane] || {},
    policyByLane[lane] || {},
    runtimes[lane],
    orchestration,
    contracts[`${lane}_runtime_contract`] || {},
  ));
  const interventionPreconditions = buildInterventionPreconditions(interventionActions, orchestration, session, authorization, releaseDecision);
  const interventionGuardrails = buildInterventionGuardrails(interventionActions, gateLayer, policyLayer, actionsLayer, transitionsLayer, orchestration);
  const interventionSummary = buildInterventionSummary(interventionActions, orchestration);
  const interventionPayload = buildInterventionPayload({
    actorRole,
    session,
    decisionAssistance,
    knowledge,
    orchestration,
    interventions: interventionActions,
  });

  return {
    updatedAt,
    actor_role: actorRole,
    intervention_surface_kind: 'operator-intervention-control',
    operator_intervention_control: {
      intervention_surface_kind: 'controlled_operator_intervention_control',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      orchestration_loop_state: orchestration.orchestration_loop_state,
      execution_gate_summary: gateLayer.execution_gate_summary,
      policy_decision_summary: policyLayer.policy_decision_summary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    intervention_actions: interventionActions,
    intervention_preconditions: interventionPreconditions,
    intervention_guardrails: interventionGuardrails,
    intervention_summary: interventionSummary,
    intervention_payload: interventionPayload,
  };
}

module.exports = {
  buildOperatorInterventionControlLayer,
  buildInterventionActions,
  buildInterventionPreconditions,
  buildInterventionGuardrails,
  buildInterventionSummary,
  buildInterventionPayload,
};
