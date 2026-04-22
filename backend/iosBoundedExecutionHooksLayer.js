const { buildIosExecutorRuntimeLayer } = require('./iosExecutorRuntimeLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildBoundedIosHookCatalog(bridge = {}, iosRuntime = {}) {
  const hooks = iosRuntime.ios_execution_hooks || {};
  return {
    hook_catalog_kind: 'bounded_ios_execution_hook_catalog',
    lane: 'ios',
    hooks: [
      {
        hook: hooks.prepare_runtime_context?.hook || 'load_supabase_snapshot',
        mode: hooks.prepare_runtime_context?.mode || 'read_only',
        executable: false,
      },
      {
        hook: hooks.validate_execution_contract?.hook || 'assert_ios_contract_boundaries',
        mode: hooks.validate_execution_contract?.mode || 'guardrail',
        executable: false,
      },
      {
        hook: hooks.stage_ios_execution?.hook || 'plan_ios_changes_noop',
        mode: hooks.stage_ios_execution?.mode || 'hold',
        executable: false,
      },
      {
        hook: hooks.request_operator_checkpoint?.hook || 'await_operator_release_signal',
        mode: hooks.request_operator_checkpoint?.mode || 'manual_gate',
        executable: false,
      },
      {
        hook: hooks.emit_execution_evidence?.hook || 'emit_ios_execution_report',
        mode: hooks.emit_execution_evidence?.mode || 'evidence_only',
        executable: false,
      },
    ],
    bridge_outcome: bridge.execution_bridge_plan?.adjudication_outcome || 'adjudication_hold_for_additional_evidence',
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildBoundedIosHookGuardrails(bridge = {}, session = {}) {
  return {
    read_only_default: true,
    bounded_ios_hooks_only: true,
    no_hidden_repo_mutations: true,
    no_uncontrolled_execution: true,
    runtime_source_of_truth: 'supabase',
    snapshot_safe_state_api: true,
    websocket_not_source_of_truth: true,
    execution_session_id: session.execution_session?.session_id || null,
    bridge_surface_kind: bridge.bounded_coordinator_execution_bridge?.bridge_surface_kind || 'controlled_bounded_coordinator_execution_bridge',
  };
}

function buildBoundedIosHookSummary(catalog = {}) {
  return {
    lane: 'ios',
    hook_total: Array.isArray(catalog.hooks) ? catalog.hooks.length : 0,
    non_executable_hook_total: Array.isArray(catalog.hooks) ? catalog.hooks.filter((hook) => hook.executable === false).length : 0,
    bridge_outcome: catalog.bridge_outcome || 'adjudication_hold_for_additional_evidence',
    explainable: true,
  };
}

function buildBoundedIosHookPayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    bridge_outcome: input.catalog?.bridge_outcome || 'adjudication_hold_for_additional_evidence',
    hook_names: (input.catalog?.hooks || []).map((hook) => hook.hook),
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildLightweightIosBridgeSnapshot(baseRuntime = {}, session = {}) {
  const tasks = Array.isArray(baseRuntime.tasks) ? baseRuntime.tasks : [];
  const approvalPendingTotal = tasks.filter((task) => String(task?.approval_state || '').toLowerCase() === 'approval_pending').length;
  return {
    execution_bridge_summary: {
      stage_total: 5,
      ready_stage_total: approvalPendingTotal > 0 ? 2 : 3,
      hold_stage_total: approvalPendingTotal > 0 ? 3 : 2,
      adjudication_outcome: approvalPendingTotal > 0 ? 'adjudication_hold_for_additional_evidence' : 'adjudication_ready_for_controlled_bridge',
      execution_session_id: session.execution_session?.session_id || null,
      explainable: true,
      governed: true,
      read_only: true,
    },
    bounded_coordinator_execution_bridge: {
      bridge_surface_kind: 'controlled_bounded_coordinator_execution_bridge',
    },
  };
}

function buildIosBoundedExecutionHooksLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const bridge = buildLightweightIosBridgeSnapshot(baseRuntime, session);
  console.log('[ios-hooks-export] before iosExecutorRuntime');
  const iosRuntime = buildIosExecutorRuntimeLayer(baseRuntime, actorRole);
  console.log('[ios-hooks-export] after iosExecutorRuntime');

  const boundedIosHookCatalog = buildBoundedIosHookCatalog(bridge, iosRuntime);
  const boundedIosHookGuardrails = buildBoundedIosHookGuardrails(bridge, session);
  const boundedIosHookSummary = buildBoundedIosHookSummary(boundedIosHookCatalog);
  const boundedIosHookPayload = buildBoundedIosHookPayload({ actorRole, session, decisionAssistance, knowledge, catalog: boundedIosHookCatalog });

  return {
    updatedAt,
    actor_role: actorRole,
    hook_surface_kind: 'ios-bounded-execution-hooks',
    ios_bounded_execution_hooks: {
      hook_surface_kind: 'controlled_ios_bounded_execution_hooks',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      bridge_summary: bridge.execution_bridge_summary,
      ios_runtime_summary: iosRuntime.ios_runtime_summary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    bounded_ios_hook_catalog: boundedIosHookCatalog,
    bounded_ios_hook_guardrails: boundedIosHookGuardrails,
    bounded_ios_hook_summary: boundedIosHookSummary,
    bounded_ios_hook_payload: boundedIosHookPayload,
  };
}

module.exports = {
  buildIosBoundedExecutionHooksLayer,
  buildBoundedIosHookCatalog,
  buildBoundedIosHookGuardrails,
  buildBoundedIosHookSummary,
  buildBoundedIosHookPayload,
};
