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

const TRANSITION_CATEGORIES = [
  'idle_to_ready',
  'ready_to_checkpoint',
  'checkpoint_to_hold',
  'checkpoint_to_advance',
  'lane_pending_to_ready',
  'lane_ready_to_active',
  'lane_active_to_result_collected',
  'loop_waiting_to_progressed',
];

const LANES = ['backend', 'ios', 'qa'];

function buildTransitionCatalog(lane, runtime = {}, actions = {}, orchestration = {}) {
  const summary = runtime[`${lane}_runtime_summary`] || {};
  const availableActions = ((actions.actions || []).filter((action) => action.available).map((action) => action.action));
  const activeLane = orchestration.orchestration_loop_state?.active_lane || null;

  return {
    lane,
    transition_catalog_kind: 'controlled_transition_catalog',
    transitions: TRANSITION_CATEGORIES.map((transition) => ({
      transition,
      lane,
      available: transition === 'checkpoint_to_hold'
        || transition === 'idle_to_ready'
        || (transition === 'checkpoint_to_advance' ? summary.authorized === true && activeLane === lane : true),
      mode: 'guarded',
      read_only: true,
      governed: true,
    })),
    execution_mode: summary.execution_mode || 'authorization_hold',
    available_actions: availableActions,
    authorized: summary.authorized === true,
    explainable: true,
  };
}

function buildTransitionPreconditions(orchestration = {}, authorization = {}, releaseDecision = {}, session = {}, catalogs = []) {
  const sessionState = session.session_lifecycle_state?.current_state || 'pending';
  const authorizationOutcome = authorization.execution_authorization_outcome?.outcome || 'authorization_withheld';
  const releaseOutcome = releaseDecision.release_decision_outcome?.decision || 'release_hold_decision';
  const loopMode = orchestration.orchestration_loop_state?.loop_mode || 'governed_hold';

  return catalogs.map((catalog) => ({
    lane: catalog.lane,
    preconditions: [
      { condition: 'session_active', status: sessionState === 'active_governed_session' ? 'pass' : 'hold', detail: sessionState },
      { condition: 'authorization_granted', status: authorizationOutcome === 'authorization_granted' ? 'pass' : 'hold', detail: authorizationOutcome },
      { condition: 'release_go', status: releaseOutcome === 'release_go_decision' ? 'pass' : 'hold', detail: releaseOutcome },
      { condition: 'loop_progression_ready', status: loopMode === 'staged_progression_ready' ? 'pass' : 'hold', detail: loopMode },
    ],
  }));
}

function buildTransitionGuardrails(orchestration = {}, contracts = {}, catalogs = []) {
  return catalogs.map((catalog) => {
    const contract = contracts[`${catalog.lane}_runtime_contract`] || {};
    return {
      lane: catalog.lane,
      guardrails: {
        read_only_default: true,
        no_hidden_repo_mutations: true,
        no_uncontrolled_execution: true,
        runtime_source_of_truth: 'supabase',
        websocket_not_source_of_truth: true,
        operator_control_required: contract.constraints?.explicit_operator_control_required === true,
        allowed_actions: contract.allowed_actions || [],
        hold_gates: (orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate),
      },
    };
  });
}

function buildStateProgressionSummary(catalogs = [], preconditions = [], orchestration = {}) {
  const transitionTotal = catalogs.reduce((sum, catalog) => sum + (catalog.transitions || []).length, 0);
  const availableTransitionTotal = catalogs.reduce((sum, catalog) => sum + (catalog.transitions || []).filter((transition) => transition.available).length, 0);
  const heldPreconditionTotal = preconditions.reduce((sum, item) => sum + item.preconditions.filter((cond) => cond.status !== 'pass').length, 0);

  return {
    lane_total: catalogs.length,
    transition_total: transitionTotal,
    available_transition_total: availableTransitionTotal,
    held_precondition_total: heldPreconditionTotal,
    loop_mode: orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    explainable: true,
  };
}

function buildStateProgressionPayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    loop_mode: input.orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    active_lane: input.orchestration.orchestration_loop_state?.active_lane || null,
    lane_execution_order: (input.orchestration.lane_execution_order || []).map((item) => item.lane),
    available_transitions_by_lane: Object.fromEntries((input.catalogs || []).map((catalog) => [
      catalog.lane,
      (catalog.transitions || []).filter((transition) => transition.available).map((transition) => transition.transition),
    ])),
    hold_gates: (input.orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate),
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildExecutorCoordinationStateTransitionsLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const contracts = buildLaneExecutorRuntimeContractsLayer(baseRuntime, actorRole);
  const authorization = buildAssistedExecutionAuthorizationLayer(baseRuntime, actorRole);
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(baseRuntime, actorRole);
  const coordinationActions = buildExecutorCoordinationActionsLayer(baseRuntime, actorRole);
  const orchestration = buildExecutorOrchestrationLoopLayer(baseRuntime, actorRole);
  const backendRuntime = buildBackendExecutorRuntimeLayer(baseRuntime, actorRole);
  const iosRuntime = buildIosExecutorRuntimeLayer(baseRuntime, actorRole);
  const qaRuntime = buildQaExecutorRuntimeLayer(baseRuntime, actorRole);

  const runtimes = { backend: backendRuntime, ios: iosRuntime, qa: qaRuntime };
  const actionCatalogMap = Object.fromEntries((coordinationActions.lane_action_catalog || []).map((item) => [item.lane, item]));
  const transitionCatalog = LANES.map((lane) => buildTransitionCatalog(lane, runtimes[lane], actionCatalogMap[lane] || {}, orchestration));
  const transitionPreconditions = buildTransitionPreconditions(orchestration, authorization, releaseDecision, session, transitionCatalog);
  const transitionGuardrails = buildTransitionGuardrails(orchestration, contracts, transitionCatalog);
  const stateProgressionSummary = buildStateProgressionSummary(transitionCatalog, transitionPreconditions, orchestration);
  const stateProgressionPayload = buildStateProgressionPayload({
    actorRole,
    session,
    decisionAssistance,
    knowledge,
    orchestration,
    catalogs: transitionCatalog,
  });

  return {
    updatedAt,
    actor_role: actorRole,
    transition_surface_kind: 'executor-coordination-state-transitions',
    executor_coordination_state_transitions: {
      transition_surface_kind: 'controlled_executor_coordination_state_transitions',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      orchestration_loop_state: orchestration.orchestration_loop_state,
      coordination_actions_summary: coordinationActions.coordination_actions_summary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    transition_catalog: transitionCatalog,
    transition_preconditions: transitionPreconditions,
    transition_guardrails: transitionGuardrails,
    state_progression_summary: stateProgressionSummary,
    state_progression_payload: stateProgressionPayload,
  };
}

module.exports = {
  buildExecutorCoordinationStateTransitionsLayer,
  buildTransitionCatalog,
  buildTransitionPreconditions,
  buildTransitionGuardrails,
  buildStateProgressionSummary,
  buildStateProgressionPayload,
};
