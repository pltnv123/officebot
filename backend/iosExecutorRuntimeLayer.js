const { buildLaneExecutorRuntimeContractsLayer } = require('./laneExecutorRuntimeContractsLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildIosExecutionPlan(input = {}) {
  const contract = input.runtimeContracts?.ios_runtime_contract || {};
  const envelope = input.envelope?.ios_execution_envelope || {};
  const taskFrames = Array.isArray(input.handoffContracts?.ios_handoff_contract?.task_framing)
    ? input.handoffContracts.ios_handoff_contract.task_framing
    : [];

  return {
    plan_kind: 'ios_controlled_execution_plan',
    execution_mode: contract.authorized ? 'staged_controlled_runtime' : 'authorization_hold',
    session_id: input.session?.execution_session?.session_id || null,
    lane: 'ios',
    allowed_actions: contract.allowed_actions || ['analyze_ios_scope', 'prepare_ios_patch', 'report_ios_artifacts'],
    target_tasks: taskFrames.map((task) => ({
      task_id: task.task_id || null,
      title: task.title || '',
      assignment_state: task.assignment_state || 'unknown',
      approval_state: task.approval_state || 'none',
    })),
    staged_steps: [
      { stage: 'prepare_context', status: 'ready', hook: 'load_supabase_snapshot' },
      { stage: 'validate_contract', status: contract.authorized ? 'ready' : 'hold', hook: 'assert_ios_contract_boundaries' },
      { stage: 'dry_scope_analysis', status: contract.authorized ? 'ready' : 'hold', hook: 'plan_ios_changes_noop' },
      { stage: 'operator_checkpoint', status: 'ready', hook: 'await_operator_release_signal' },
      { stage: 'evidence_packaging', status: 'ready', hook: 'emit_ios_execution_report' },
    ],
    scope: envelope.scope || [],
    dependencies: envelope.dependencies || [],
    blockers: envelope.blockers || [],
    explainable: true,
    governed: true,
  };
}

function buildIosExecutionConstraints(input = {}) {
  const contract = input.runtimeContracts?.ios_runtime_contract || {};
  const authorization = input.authorization || {};
  const releaseDecision = input.releaseDecision || {};

  return {
    lane: 'ios',
    runtime_source_of_truth: 'supabase',
    snapshot_safe_api_state: true,
    websocket_not_source_of_truth: true,
    read_only_by_default: true,
    bounded_contract_required: true,
    explicit_operator_control_required: authorization.operator_authorization_requirements?.explicit_operator_approval === true,
    no_uncontrolled_autonomous_execution: true,
    no_hidden_repo_mutations: true,
    release_decision: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
    governance_outcome: contract.runtime_inputs?.governance_outcome || 'dispatch_hold_decision',
    reconciliation_outcome: contract.runtime_inputs?.reconciliation_outcome || 'lane_reconciliation_hold',
    failure_mode: contract.failure_semantics?.failure_mode || 'bounded_failure_report_required',
    timeout_expectation: contract.failure_semantics?.timeout_expectation || 'bounded_execution_window',
    explainable: true,
  };
}

function buildIosExecutionHooks(input = {}) {
  const authorized = input.runtimeContracts?.ios_runtime_contract?.authorized === true;
  const sessionId = input.session?.execution_session?.session_id || null;

  return {
    hook_mode: authorized ? 'controlled_dry_runtime' : 'authorization_hold_runtime',
    prepare_runtime_context: {
      hook: 'load_supabase_snapshot',
      mode: 'read_only',
      runtime_source: 'supabase',
      session_id: sessionId,
      executable: false,
    },
    validate_execution_contract: {
      hook: 'assert_ios_contract_boundaries',
      mode: 'guardrail',
      executable: false,
    },
    stage_ios_execution: {
      hook: 'plan_ios_changes_noop',
      mode: authorized ? 'dry_run' : 'hold',
      executable: false,
      no_repo_mutation: true,
    },
    request_operator_checkpoint: {
      hook: 'await_operator_release_signal',
      mode: 'manual_gate',
      executable: false,
    },
    emit_execution_evidence: {
      hook: 'emit_ios_execution_report',
      mode: 'evidence_only',
      executable: false,
    },
  };
}

function buildIosRuntimeSummary(input = {}) {
  const plan = input.plan || {};
  const contract = input.runtimeContracts?.ios_runtime_contract || {};

  return {
    lane: 'ios',
    authorized: contract.authorized === true,
    session_enrolled: contract.session_enrolled === true,
    execution_mode: plan.execution_mode || 'authorization_hold',
    planned_task_total: Array.isArray(plan.target_tasks) ? plan.target_tasks.length : 0,
    blocker_total: Array.isArray(plan.blockers) ? plan.blockers.length : 0,
    release_posture: input.review?.release_posture?.posture || 'operator_review_hold',
    simulation_posture: input.simulation?.ios_launch_simulation?.execution_framing?.simulated_launch_posture || 'simulated_hold',
    reconciliation_outcome: input.reconciliation?.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
    explainable: true,
  };
}

function buildIosRuntimePayload(input = {}) {
  const contract = input.runtimeContracts?.ios_runtime_contract || {};
  const summary = input.summary || {};

  return {
    actor_role: input.actorRole,
    lane: 'ios',
    execution_session_id: input.session?.execution_session?.session_id || null,
    authorization_outcome: input.authorization?.execution_authorization_outcome?.outcome || 'authorization_withheld',
    release_decision: input.releaseDecision?.release_decision_outcome?.decision || 'release_hold_decision',
    operator_release_posture: input.review?.release_posture?.posture || 'operator_review_hold',
    simulated_launch_posture: input.simulation?.ios_launch_simulation?.execution_framing?.simulated_launch_posture || 'simulated_hold',
    governance_outcome: contract.runtime_inputs?.governance_outcome || 'dispatch_hold_decision',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    coordination_owner: input.envelope?.execution_envelope_payload?.coordination_owner || input.laneHandoff?.lane_handoff_payload?.decision_owner || 'orchestrator',
    lane_handoff_ready: input.laneHandoff?.lane_handoff_summary?.ready_lanes || 0,
    reconciliation_outcome: input.reconciliation?.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
    contract_scope: contract.executable_payload?.scope || [],
    contract_blockers: contract.executable_payload?.blockers || [],
    authorized: summary.authorized === true,
    read_only: true,
    governed: true,
    explainable: true,
    runtime_source: 'supabase',
  };
}

function buildIosRuntimeInputPack(runtimeState = {}, actorRole = 'orchestrator') {
  const knowledge = buildKnowledgeAwareContext(runtimeState, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(runtimeState, actorRole);
  const session = buildExecutionSessionModelLayer(runtimeState, actorRole);
  const runtimeContracts = buildLaneExecutorRuntimeContractsLayer(runtimeState, actorRole);
  const authorization = buildAssistedExecutionAuthorizationLayer(runtimeState, actorRole);
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(runtimeState, actorRole);
  const iosContract = runtimeContracts.ios_runtime_contract || {};
  const authorized = iosContract.authorized === true;
  const decisionOwner = session.session_audit_context?.decision_owner || authorization.authorization_payload?.decision_owner || releaseDecision.release_decision_payload?.decision_owner || decisionAssistance.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || actorRole;
  const scope = iosContract.executable_payload?.scope || [];
  const blockers = iosContract.executable_payload?.blockers || (authorized ? [] : ['not_authorized_for_ios_execution']);
  const dependencies = iosContract.executable_payload?.dependencies || [];

  return {
    knowledge,
    decisionAssistance,
    session,
    runtimeContracts,
    authorization,
    releaseDecision,
    review: {
      release_posture: {
        posture: session.execution_session_payload?.operator_release_posture || authorization.authorization_payload?.operator_release_posture || releaseDecision.release_decision_payload?.operator_release_posture || 'operator_review_hold',
      },
    },
    simulation: {
      ios_launch_simulation: {
        execution_framing: {
          simulated_launch_posture: authorized && blockers.length === 0 ? 'simulated_ready' : 'simulated_hold',
        },
      },
    },
    envelope: {
      ios_execution_envelope: {
        envelope_kind: 'read_only_execution_envelope',
        scope,
        dependencies,
        blockers,
      },
      execution_envelope_payload: {
        coordination_owner: decisionOwner,
      },
    },
    handoffContracts: {
      ios_handoff_contract: {
        task_framing: (session.session_lanes || []).filter((entry) => entry.lane === 'ios').map((entry) => ({
          task_id: entry.task_id || null,
          title: entry.title || '',
          assignment_state: entry.assignment_state || 'unknown',
          approval_state: entry.approval_state || 'none',
        })),
      },
    },
    reconciliation: {
      reconciliation_outcome: {
        outcome: iosContract.runtime_inputs?.reconciliation_outcome || session.execution_session_payload?.reconciliation_outcome || authorization.authorization_payload?.reconciliation_outcome || releaseDecision.release_decision_payload?.reconciliation_outcome || 'lane_reconciliation_hold',
      },
    },
    laneHandoff: {
      lane_handoff_summary: {
        ready_lanes: iosContract.runtime_inputs?.lane_handoff_ready || session.execution_session_payload?.lane_handoff_ready || authorization.authorization_payload?.lane_handoff_ready || releaseDecision.release_decision_payload?.lane_handoff_ready || 0,
      },
      lane_handoff_payload: {
        decision_owner: decisionOwner,
      },
    },
  };
}

function buildIosExecutorRuntimeLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };
  const inputPack = buildIosRuntimeInputPack(baseRuntime, actorRole);
  const { knowledge, decisionAssistance, session, runtimeContracts, authorization, releaseDecision, review, simulation, envelope, handoffContracts, reconciliation, laneHandoff } = inputPack;

  const iosExecutionPlan = buildIosExecutionPlan({ session, runtimeContracts, envelope, handoffContracts });
  const iosExecutionConstraints = buildIosExecutionConstraints({ runtimeContracts, authorization, releaseDecision });
  const iosExecutionHooks = buildIosExecutionHooks({ session, runtimeContracts });
  const iosRuntimeSummary = buildIosRuntimeSummary({ plan: iosExecutionPlan, runtimeContracts, review, simulation, reconciliation });
  const iosRuntimePayload = buildIosRuntimePayload({ actorRole, session, authorization, releaseDecision, review, simulation, runtimeContracts, envelope, laneHandoff, reconciliation, decisionAssistance, knowledge, summary: iosRuntimeSummary });

  return {
    updatedAt,
    actor_role: actorRole,
    runtime_layer_kind: 'ios-executor-runtime',
    ios_executor_runtime: {
      lane: 'ios',
      runtime_kind: 'controlled_ios_executor_runtime',
      session_id: session.execution_session?.session_id || null,
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      execution_mode: iosExecutionPlan.execution_mode,
      authorization_outcome: authorization.execution_authorization_outcome?.outcome || 'authorization_withheld',
      release_decision: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
      contract: runtimeContracts.ios_runtime_contract || null,
      knowledge_routing: knowledge.routing_summary,
      decision_assistance: decisionAssistance.planning_output,
    },
    ios_execution_plan: iosExecutionPlan,
    ios_execution_constraints: iosExecutionConstraints,
    ios_execution_hooks: iosExecutionHooks,
    ios_runtime_summary: iosRuntimeSummary,
    ios_runtime_payload: iosRuntimePayload,
  };
}

module.exports = {
  buildIosExecutorRuntimeLayer,
  buildIosExecutionPlan,
  buildIosExecutionConstraints,
  buildIosExecutionHooks,
  buildIosRuntimeSummary,
  buildIosRuntimePayload,
};
