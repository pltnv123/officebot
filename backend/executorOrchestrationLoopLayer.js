const { buildBackendExecutorRuntimeLayer } = require('./backendExecutorRuntimeLayer');
const { buildIosExecutorRuntimeLayer } = require('./iosExecutorRuntimeLayer');
const { buildQaExecutorRuntimeLayer } = require('./qaExecutorRuntimeLayer');
const { buildLaneExecutorRuntimeContractsLayer } = require('./laneExecutorRuntimeContractsLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

const LANE_ORDER = ['backend', 'ios', 'qa'];

function buildLaneExecutionOrder(runtimes = {}) {
  return LANE_ORDER.map((lane, index) => {
    const runtime = runtimes[lane] || {};
    const summary = runtime[`${lane}_runtime_summary`] || {};
    const plan = runtime[`${lane}_execution_plan`] || {};
    return {
      lane,
      order_index: index,
      execution_mode: summary.execution_mode || plan.execution_mode || 'authorization_hold',
      authorized: summary.authorized === true,
      session_enrolled: summary.session_enrolled === true,
      blocker_total: summary.blocker_total || 0,
      progression_status: summary.authorized === true ? 'eligible_for_staged_progression' : 'hold',
    };
  });
}

function buildCrossLaneExecutionGates(runtimes = {}, session = {}, authorization = {}, releaseDecision = {}, contracts = {}) {
  const order = LANE_ORDER.map((lane) => ({ lane, runtime: runtimes[lane] || {}, contract: contracts[`${lane}_runtime_contract`] || {} }));
  const authorizedCount = order.filter((item) => item.contract.authorized === true).length;

  return [
    {
      gate: 'execution_session_state',
      status: session.session_lifecycle_state?.current_state === 'active_governed_session' ? 'pass' : 'hold',
      detail: session.session_lifecycle_state?.current_state || 'pending',
    },
    {
      gate: 'authorization_surface',
      status: authorization.execution_authorization_outcome?.outcome === 'authorization_granted' ? 'pass' : 'hold',
      detail: authorization.execution_authorization_outcome?.outcome || 'authorization_withheld',
    },
    {
      gate: 'release_decision_surface',
      status: releaseDecision.release_decision_outcome?.decision === 'release_go_decision' ? 'pass' : 'hold',
      detail: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
    },
    {
      gate: 'lane_runtime_contracts',
      status: authorizedCount > 0 ? 'pass' : 'hold',
      detail: `${authorizedCount} authorized lane contracts`,
    },
  ];
}

function buildOrchestrationLoopState(input = {}) {
  const laneOrder = input.laneExecutionOrder || [];
  const gates = input.crossLaneExecutionGates || [];
  const readyLanes = laneOrder.filter((item) => item.progression_status === 'eligible_for_staged_progression');
  const holds = gates.filter((gate) => gate.status !== 'pass').length;

  return {
    loop_kind: 'governed_executor_orchestration_loop',
    runtime_source: 'supabase',
    loop_mode: readyLanes.length > 0 && holds === 0 ? 'staged_progression_ready' : 'governed_hold',
    active_lane: readyLanes[0]?.lane || null,
    ready_lane_total: readyLanes.length,
    blocked_lane_total: laneOrder.filter((item) => item.progression_status !== 'eligible_for_staged_progression').length,
    gate_hold_total: holds,
    controlled: true,
    explainable: true,
  };
}

function buildOrchestrationLoopSummary(loopState = {}, laneOrder = [], gates = []) {
  return {
    lane_total: laneOrder.length,
    ready_lane_total: loopState.ready_lane_total || 0,
    blocked_lane_total: loopState.blocked_lane_total || 0,
    gate_total: gates.length,
    hold_gate_total: gates.filter((gate) => gate.status !== 'pass').length,
    loop_mode: loopState.loop_mode || 'governed_hold',
    explainable: true,
  };
}

function buildOrchestrationLoopPayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    authorization_outcome: input.authorization?.execution_authorization_outcome?.outcome || 'authorization_withheld',
    release_decision: input.releaseDecision?.release_decision_outcome?.decision || 'release_hold_decision',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    loop_mode: input.loopState?.loop_mode || 'governed_hold',
    active_lane: input.loopState?.active_lane || null,
    lane_execution_order: (input.laneExecutionOrder || []).map((item) => item.lane),
    cross_lane_hold_gates: (input.crossLaneExecutionGates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate),
    ready_lane_total: input.loopState?.ready_lane_total || 0,
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildExecutorOrchestrationLoopLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const contracts = buildLaneExecutorRuntimeContractsLayer(baseRuntime, actorRole);
  const authorization = buildAssistedExecutionAuthorizationLayer(baseRuntime, actorRole);
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(baseRuntime, actorRole);
  const backendRuntime = buildBackendExecutorRuntimeLayer(baseRuntime, actorRole);
  const iosRuntime = buildIosExecutorRuntimeLayer(baseRuntime, actorRole);
  const qaRuntime = buildQaExecutorRuntimeLayer(baseRuntime, actorRole);

  const runtimes = {
    backend: backendRuntime,
    ios: iosRuntime,
    qa: qaRuntime,
  };

  const laneExecutionOrder = buildLaneExecutionOrder(runtimes);
  const crossLaneExecutionGates = buildCrossLaneExecutionGates(runtimes, session, authorization, releaseDecision, contracts);
  const orchestrationLoopState = buildOrchestrationLoopState({ laneExecutionOrder, crossLaneExecutionGates });
  const orchestrationLoopSummary = buildOrchestrationLoopSummary(orchestrationLoopState, laneExecutionOrder, crossLaneExecutionGates);
  const orchestrationLoopPayload = buildOrchestrationLoopPayload({
    actorRole,
    session,
    authorization,
    releaseDecision,
    decisionAssistance,
    knowledge,
    loopState: orchestrationLoopState,
    laneExecutionOrder,
    crossLaneExecutionGates,
  });

  return {
    updatedAt,
    actor_role: actorRole,
    orchestration_layer_kind: 'executor-orchestration-loop',
    executor_orchestration_loop: {
      loop_kind: 'governed_executor_orchestration_loop',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      backend_runtime: backendRuntime.backend_runtime_summary,
      ios_runtime: iosRuntime.ios_runtime_summary,
      qa_runtime: qaRuntime.qa_runtime_summary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    orchestration_loop_state: orchestrationLoopState,
    lane_execution_order: laneExecutionOrder,
    cross_lane_execution_gates: crossLaneExecutionGates,
    orchestration_loop_summary: orchestrationLoopSummary,
    orchestration_loop_payload: orchestrationLoopPayload,
  };
}

module.exports = {
  buildExecutorOrchestrationLoopLayer,
  buildLaneExecutionOrder,
  buildCrossLaneExecutionGates,
  buildOrchestrationLoopState,
  buildOrchestrationLoopSummary,
  buildOrchestrationLoopPayload,
};
