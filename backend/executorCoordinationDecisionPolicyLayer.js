const { buildExecutorCoordinationActionsLayer } = require('./executorCoordinationActionsLayer');
const { buildExecutorCoordinationStateTransitionsLayer } = require('./executorCoordinationStateTransitionsLayer');
const { buildExecutorOrchestrationLoopLayer } = require('./executorOrchestrationLoopLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

const LANES = ['backend', 'ios', 'qa'];

function buildPolicyDecisionCatalog(lane, actionCatalog = {}, transitionCatalog = {}, orchestration = {}, authorization = {}, releaseDecision = {}, session = {}) {
  const availableActions = Array.isArray(actionCatalog.actions)
    ? actionCatalog.actions.filter((action) => action.available).map((action) => action.action)
    : [];
  const availableTransitions = Array.isArray(transitionCatalog.transitions)
    ? transitionCatalog.transitions.filter((transition) => transition.available).map((transition) => transition.transition)
    : [];
  const loopState = orchestration.orchestration_loop_state || {};
  const activeLane = loopState.active_lane || null;
  const authorizationOutcome = authorization.execution_authorization_outcome?.outcome || 'authorization_withheld';
  const releaseOutcome = releaseDecision.release_decision_outcome?.decision || 'release_hold_decision';
  const sessionState = session.session_lifecycle_state?.current_state || 'pending';

  let selectedAction = 'request_operator_checkpoint';
  let selectedTransition = 'checkpoint_to_hold';
  let selectionMode = 'hold';
  let rationale = 'Await operator checkpoint until governed execution prerequisites pass.';

  const canAdvance = lane === activeLane
    && authorizationOutcome === 'authorization_granted'
    && releaseOutcome === 'release_go_decision'
    && sessionState === 'active_governed_session'
    && availableActions.includes('advance_lane_stage')
    && availableTransitions.includes('checkpoint_to_advance');

  if (canAdvance) {
    selectedAction = 'advance_lane_stage';
    selectedTransition = 'checkpoint_to_advance';
    selectionMode = 'guarded_progression';
    rationale = 'Lane is active and all governed progression prerequisites are satisfied.';
  } else if (availableActions.includes('hold_lane') && availableTransitions.includes('checkpoint_to_hold')) {
    selectedAction = 'hold_lane';
    selectedTransition = 'checkpoint_to_hold';
    rationale = 'Policy holds lane progression until authorization, release, and loop gates align.';
  }

  return {
    lane,
    policy_decision_kind: 'guarded_coordination_policy_decision',
    selected_action: selectedAction,
    selected_transition: selectedTransition,
    selection_mode: selectionMode,
    available_actions: availableActions,
    available_transitions: availableTransitions,
    orchestration_state: loopState.loop_mode || 'governed_hold',
    active_lane: activeLane,
    rationale,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildPolicySelectionInputs(orchestration = {}, authorization = {}, releaseDecision = {}, session = {}, catalogs = []) {
  const loopState = orchestration.orchestration_loop_state || {};
  const authorizationOutcome = authorization.execution_authorization_outcome?.outcome || 'authorization_withheld';
  const releaseOutcome = releaseDecision.release_decision_outcome?.decision || 'release_hold_decision';
  const sessionState = session.session_lifecycle_state?.current_state || 'pending';

  return catalogs.map((catalog) => ({
    lane: catalog.lane,
    selection_inputs: {
      loop_mode: loopState.loop_mode || 'governed_hold',
      active_lane: loopState.active_lane || null,
      authorization_outcome: authorizationOutcome,
      release_decision: releaseOutcome,
      session_state: sessionState,
      available_action_count: Array.isArray(catalog.available_actions) ? catalog.available_actions.length : 0,
      available_transition_count: Array.isArray(catalog.available_transitions) ? catalog.available_transitions.length : 0,
    },
  }));
}

function buildPolicyGuardrails(orchestration = {}, actions = {}, transitions = {}, catalogs = []) {
  const holdGates = (orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate);
  return catalogs.map((catalog) => ({
    lane: catalog.lane,
    guardrails: {
      read_only_default: true,
      no_uncontrolled_execution: true,
      explicit_operator_checkpoint_default: true,
      runtime_source_of_truth: 'supabase',
      action_surface_kind: actions.executor_coordination_actions?.action_surface_kind || 'controlled_executor_coordination_actions',
      transition_surface_kind: transitions.executor_coordination_state_transitions?.transition_surface_kind || 'controlled_executor_coordination_state_transitions',
      hold_gates: holdGates,
      governed_policy_selection_only: true,
    },
  }));
}

function buildPolicyDecisionSummary(catalogs = [], orchestration = {}) {
  const advanceCount = catalogs.filter((catalog) => catalog.selected_action === 'advance_lane_stage').length;
  const holdCount = catalogs.filter((catalog) => catalog.selected_action === 'hold_lane' || catalog.selected_action === 'request_operator_checkpoint').length;
  return {
    lane_total: catalogs.length,
    guarded_progression_total: advanceCount,
    held_policy_total: holdCount,
    loop_mode: orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    explainable: true,
  };
}

function buildPolicyDecisionPayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    loop_mode: input.orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    active_lane: input.orchestration.orchestration_loop_state?.active_lane || null,
    selected_policy_by_lane: Object.fromEntries((input.catalogs || []).map((catalog) => [
      catalog.lane,
      {
        action: catalog.selected_action,
        transition: catalog.selected_transition,
        selection_mode: catalog.selection_mode,
      },
    ])),
    hold_gates: (input.orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate),
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildExecutorCoordinationDecisionPolicyLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const authorization = buildAssistedExecutionAuthorizationLayer(baseRuntime, actorRole);
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(baseRuntime, actorRole);
  const orchestration = buildExecutorOrchestrationLoopLayer(baseRuntime, actorRole);
  const actions = buildExecutorCoordinationActionsLayer(baseRuntime, actorRole);
  const transitions = buildExecutorCoordinationStateTransitionsLayer(baseRuntime, actorRole);

  const actionCatalogMap = Object.fromEntries((actions.lane_action_catalog || []).map((item) => [item.lane, item]));
  const transitionCatalogMap = Object.fromEntries((transitions.transition_catalog || []).map((item) => [item.lane, item]));
  const policyDecisionCatalog = LANES.map((lane) => buildPolicyDecisionCatalog(
    lane,
    actionCatalogMap[lane] || {},
    transitionCatalogMap[lane] || {},
    orchestration,
    authorization,
    releaseDecision,
    session,
  ));
  const policySelectionInputs = buildPolicySelectionInputs(orchestration, authorization, releaseDecision, session, policyDecisionCatalog);
  const policyGuardrails = buildPolicyGuardrails(orchestration, actions, transitions, policyDecisionCatalog);
  const policyDecisionSummary = buildPolicyDecisionSummary(policyDecisionCatalog, orchestration);
  const policyDecisionPayload = buildPolicyDecisionPayload({
    actorRole,
    session,
    decisionAssistance,
    knowledge,
    orchestration,
    catalogs: policyDecisionCatalog,
  });

  return {
    updatedAt,
    actor_role: actorRole,
    policy_surface_kind: 'executor-coordination-decision-policy',
    executor_coordination_decision_policy: {
      policy_surface_kind: 'controlled_executor_coordination_decision_policy',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      orchestration_loop_state: orchestration.orchestration_loop_state,
      coordination_actions_summary: actions.coordination_actions_summary,
      state_progression_summary: transitions.state_progression_summary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    policy_decision_catalog: policyDecisionCatalog,
    policy_selection_inputs: policySelectionInputs,
    policy_guardrails: policyGuardrails,
    policy_decision_summary: policyDecisionSummary,
    policy_decision_payload: policyDecisionPayload,
  };
}

module.exports = {
  buildExecutorCoordinationDecisionPolicyLayer,
  buildPolicyDecisionCatalog,
  buildPolicySelectionInputs,
  buildPolicyGuardrails,
  buildPolicyDecisionSummary,
  buildPolicyDecisionPayload,
};
