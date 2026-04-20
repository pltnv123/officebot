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

const ACTION_CATEGORIES = [
  'request_operator_checkpoint',
  'mark_lane_ready',
  'hold_lane',
  'advance_lane_stage',
  'emit_lane_status_update',
  'prepare_noop_execution_hook',
  'collect_lane_action_result',
];

const LANES = ['backend', 'ios', 'qa'];

function buildLaneActionCatalog(lane, runtime = {}, contract = {}, loopState = {}) {
  const summary = runtime[`${lane}_runtime_summary`] || {};
  const plan = runtime[`${lane}_execution_plan`] || {};
  const hookKey = lane === 'backend' ? 'stage_backend_execution' : lane === 'ios' ? 'stage_ios_execution' : 'stage_qa_execution';
  const hook = runtime[`${lane}_execution_hooks`]?.[hookKey] || {};
  const activeLane = loopState.active_lane;

  return {
    lane,
    action_catalog_kind: 'controlled_lane_action_catalog',
    actions: ACTION_CATEGORIES.map((action) => ({
      action,
      lane,
      available: action === 'hold_lane'
        || action === 'emit_lane_status_update'
        || action === 'request_operator_checkpoint'
        || (action === 'advance_lane_stage' ? summary.authorized === true && activeLane === lane : true),
      mode: action === 'prepare_noop_execution_hook' ? (hook.mode || 'hold') : 'guarded',
      read_only: true,
      governed: true,
    })),
    current_stage: Array.isArray(plan.staged_steps) ? plan.staged_steps.find((step) => step.status === 'ready')?.stage || null : null,
    execution_mode: summary.execution_mode || 'authorization_hold',
    authorized: contract.authorized === true,
    explainable: true,
  };
}

function buildActionPreconditions(orchestration = {}, authorization = {}, releaseDecision = {}, session = {}, catalogs = []) {
  const base = {
    execution_session_state: session.session_lifecycle_state?.current_state || 'pending',
    authorization_outcome: authorization.execution_authorization_outcome?.outcome || 'authorization_withheld',
    release_decision: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
    loop_mode: orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
  };

  return catalogs.map((catalog) => ({
    lane: catalog.lane,
    preconditions: [
      { condition: 'session_active', status: base.execution_session_state === 'active_governed_session' ? 'pass' : 'hold', detail: base.execution_session_state },
      { condition: 'authorization_granted', status: base.authorization_outcome === 'authorization_granted' ? 'pass' : 'hold', detail: base.authorization_outcome },
      { condition: 'release_go', status: base.release_decision === 'release_go_decision' ? 'pass' : 'hold', detail: base.release_decision },
      { condition: 'orchestration_ready', status: base.loop_mode === 'staged_progression_ready' ? 'pass' : 'hold', detail: base.loop_mode },
    ],
  }));
}

function buildActionGuardrails(orchestration = {}, contracts = {}, catalogs = []) {
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

function buildCoordinationActionsSummary(catalogs = [], preconditions = [], orchestration = {}) {
  const totalActions = catalogs.reduce((sum, catalog) => sum + (Array.isArray(catalog.actions) ? catalog.actions.length : 0), 0);
  const availableActions = catalogs.reduce((sum, catalog) => sum + (catalog.actions || []).filter((action) => action.available).length, 0);
  const heldPreconditions = preconditions.reduce((sum, item) => sum + item.preconditions.filter((cond) => cond.status !== 'pass').length, 0);

  return {
    lane_total: catalogs.length,
    action_total: totalActions,
    available_action_total: availableActions,
    held_precondition_total: heldPreconditions,
    loop_mode: orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    explainable: true,
  };
}

function buildCoordinationActionsPayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    loop_mode: input.orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    active_lane: input.orchestration.orchestration_loop_state?.active_lane || null,
    lane_execution_order: (input.orchestration.lane_execution_order || []).map((item) => item.lane),
    available_actions_by_lane: Object.fromEntries((input.catalogs || []).map((catalog) => [
      catalog.lane,
      (catalog.actions || []).filter((action) => action.available).map((action) => action.action),
    ])),
    hold_gates: (input.orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate),
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildExecutorCoordinationActionsLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const contracts = buildLaneExecutorRuntimeContractsLayer(baseRuntime, actorRole);
  const authorization = buildAssistedExecutionAuthorizationLayer(baseRuntime, actorRole);
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(baseRuntime, actorRole);
  const orchestration = buildExecutorOrchestrationLoopLayer(baseRuntime, actorRole);
  const backendRuntime = buildBackendExecutorRuntimeLayer(baseRuntime, actorRole);
  const iosRuntime = buildIosExecutorRuntimeLayer(baseRuntime, actorRole);
  const qaRuntime = buildQaExecutorRuntimeLayer(baseRuntime, actorRole);

  const runtimes = { backend: backendRuntime, ios: iosRuntime, qa: qaRuntime };
  const laneActionCatalog = LANES.map((lane) => buildLaneActionCatalog(lane, runtimes[lane], contracts[`${lane}_runtime_contract`], orchestration.orchestration_loop_state));
  const actionPreconditions = buildActionPreconditions(orchestration, authorization, releaseDecision, session, laneActionCatalog);
  const actionGuardrails = buildActionGuardrails(orchestration, contracts, laneActionCatalog);
  const coordinationActionsSummary = buildCoordinationActionsSummary(laneActionCatalog, actionPreconditions, orchestration);
  const coordinationActionsPayload = buildCoordinationActionsPayload({
    actorRole,
    session,
    decisionAssistance,
    knowledge,
    orchestration,
    catalogs: laneActionCatalog,
  });

  return {
    updatedAt,
    actor_role: actorRole,
    action_surface_kind: 'executor-coordination-actions',
    executor_coordination_actions: {
      action_surface_kind: 'controlled_executor_coordination_actions',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      orchestration_loop_state: orchestration.orchestration_loop_state,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    lane_action_catalog: laneActionCatalog,
    action_preconditions: actionPreconditions,
    action_guardrails: actionGuardrails,
    coordination_actions_summary: coordinationActionsSummary,
    coordination_actions_payload: coordinationActionsPayload,
  };
}

module.exports = {
  buildExecutorCoordinationActionsLayer,
  buildLaneActionCatalog,
  buildActionPreconditions,
  buildActionGuardrails,
  buildCoordinationActionsSummary,
  buildCoordinationActionsPayload,
};
