const { buildOperatorInterventionControlLayer } = require('./operatorInterventionControlLayer');
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

const LANES = ['backend', 'ios', 'qa'];

function buildEvidenceCatalog(lane, runtime = {}, contract = {}, gate = {}, intervention = {}) {
  const runtimePayload = runtime[`${lane}_runtime_payload`] || {};
  const runtimeSummary = runtime[`${lane}_runtime_summary`] || {};
  const executionPlan = runtime[`${lane}_execution_plan`] || {};
  const hookKey = lane === 'backend' ? 'stage_backend_execution' : lane === 'ios' ? 'stage_ios_execution' : 'stage_qa_execution';
  const hook = runtime[`${lane}_execution_hooks`]?.[hookKey] || {};
  const availableInterventions = Array.isArray(intervention.actions)
    ? intervention.actions.filter((action) => action.available).map((action) => action.action)
    : [];

  return {
    lane,
    evidence_catalog_kind: 'controlled_lane_evidence_catalog',
    evidence_references: [
      {
        type: 'runtime_summary',
        ref: `${lane}_runtime_summary`,
        status: runtimeSummary.authorized === true ? 'ready' : 'hold',
      },
      {
        type: 'execution_report',
        ref: `${lane}_execution_plan`,
        status: Array.isArray(executionPlan.target_tasks) && executionPlan.target_tasks.length > 0 ? 'ready' : 'pending',
      },
      {
        type: 'status_artifact',
        ref: `${lane}_runtime_payload`,
        status: runtimePayload.runtime_source === 'supabase' ? 'ready' : 'hold',
      },
      {
        type: 'operator_intervention_surface',
        ref: `${lane}_intervention_actions`,
        status: availableInterventions.length > 0 ? 'ready' : 'pending',
      },
      {
        type: 'execution_gate_outcome',
        ref: `${lane}_execution_gate`,
        status: gate.gate_outcome || 'hold',
      },
    ],
    hook_mode: hook.mode || 'hold',
    contract_scope: contract.executable_payload?.scope || [],
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildLaneEvidenceEntries(lane, runtime = {}, gate = {}, intervention = {}, session = {}, decisionPolicy = {}) {
  const runtimeSummary = runtime[`${lane}_runtime_summary`] || {};
  const runtimePayload = runtime[`${lane}_runtime_payload`] || {};
  return {
    lane,
    evidence_entry_kind: 'bounded_lane_evidence_entry',
    execution_session_id: session.execution_session?.session_id || null,
    authorized: runtimeSummary.authorized === true,
    execution_mode: runtimeSummary.execution_mode || 'authorization_hold',
    gate_outcome: gate.gate_outcome || 'hold',
    gate_category: gate.gate_category || 'hold_on_policy_guardrail_violation',
    selected_action: decisionPolicy.selected_action || 'request_operator_checkpoint',
    selected_transition: decisionPolicy.selected_transition || 'checkpoint_to_hold',
    available_interventions: Array.isArray(intervention.actions)
      ? intervention.actions.filter((action) => action.available).map((action) => action.action)
      : [],
    evidence_summary: {
      operator_release_posture: runtimePayload.operator_release_posture || 'operator_review_hold',
      reconciliation_outcome: runtimePayload.reconciliation_outcome || 'lane_reconciliation_hold',
      contract_blocker_total: Array.isArray(runtimePayload.contract_blockers) ? runtimePayload.contract_blockers.length : 0,
      contract_scope_total: Array.isArray(runtimePayload.contract_scope) ? runtimePayload.contract_scope.length : 0,
    },
    runtime_source: 'supabase',
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildEvidenceGuardrails(catalogs = [], orchestration = {}, interventionLayer = {}, gateLayer = {}) {
  const holdGates = (orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate);
  return catalogs.map((catalog) => ({
    lane: catalog.lane,
    guardrails: {
      read_only_default: true,
      evidence_only_collection: true,
      no_hidden_repo_mutations: true,
      no_uncontrolled_execution: true,
      snapshot_safe_state_api: true,
      websocket_not_source_of_truth: true,
      runtime_source_of_truth: 'supabase',
      operator_control_surface_kind: interventionLayer.operator_intervention_control?.intervention_surface_kind || 'controlled_operator_intervention_control',
      execution_gate_surface_kind: gateLayer.executor_coordination_execution_gate?.gate_surface_kind || 'controlled_executor_coordination_execution_gate',
      hold_gates: holdGates,
    },
  }));
}

function buildEvidenceSummary(catalogs = [], entries = [], orchestration = {}) {
  return {
    lane_total: catalogs.length,
    evidence_reference_total: catalogs.reduce((sum, item) => sum + (item.evidence_references || []).length, 0),
    authorized_lane_total: entries.filter((entry) => entry.authorized).length,
    held_lane_total: entries.filter((entry) => entry.gate_outcome !== 'allow').length,
    loop_mode: orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    explainable: true,
  };
}

function buildEvidencePayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    loop_mode: input.orchestration.orchestration_loop_state?.loop_mode || 'governed_hold',
    active_lane: input.orchestration.orchestration_loop_state?.active_lane || null,
    lane_evidence_status: Object.fromEntries((input.entries || []).map((entry) => [
      entry.lane,
      {
        gate_outcome: entry.gate_outcome,
        authorized: entry.authorized,
        available_interventions: entry.available_interventions,
      },
    ])),
    hold_gates: (input.orchestration.cross_lane_execution_gates || []).filter((gate) => gate.status !== 'pass').map((gate) => gate.gate),
    evidence_first: true,
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildExecutionEvidenceLedgerLayer(runtimeState = {}, actorRole = 'orchestrator') {
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
  const actionsLayer = buildExecutorCoordinationActionsLayer(baseRuntime, actorRole);
  const transitionsLayer = buildExecutorCoordinationStateTransitionsLayer(baseRuntime, actorRole);
  const policyLayer = buildExecutorCoordinationDecisionPolicyLayer(baseRuntime, actorRole);
  const gateLayer = buildExecutorCoordinationExecutionGateLayer(baseRuntime, actorRole);
  const interventionLayer = buildOperatorInterventionControlLayer(baseRuntime, actorRole);
  const backendRuntime = buildBackendExecutorRuntimeLayer(baseRuntime, actorRole);
  const iosRuntime = buildIosExecutorRuntimeLayer(baseRuntime, actorRole);
  const qaRuntime = buildQaExecutorRuntimeLayer(baseRuntime, actorRole);

  const runtimes = { backend: backendRuntime, ios: iosRuntime, qa: qaRuntime };
  const gateByLane = Object.fromEntries((gateLayer.execution_gate_outcome || []).map((item) => [item.lane, item]));
  const interventionByLane = Object.fromEntries((interventionLayer.intervention_actions || []).map((item) => [item.lane, item]));
  const decisionByLane = Object.fromEntries((policyLayer.policy_decision_catalog || []).map((item) => [item.lane, item]));

  const evidenceCatalog = LANES.map((lane) => buildEvidenceCatalog(
    lane,
    runtimes[lane],
    contracts[`${lane}_runtime_contract`] || {},
    gateByLane[lane] || {},
    interventionByLane[lane] || {},
  ));
  const laneEvidenceEntries = LANES.map((lane) => buildLaneEvidenceEntries(
    lane,
    runtimes[lane],
    gateByLane[lane] || {},
    interventionByLane[lane] || {},
    session,
    decisionByLane[lane] || {},
  ));
  const evidenceGuardrails = buildEvidenceGuardrails(evidenceCatalog, orchestration, interventionLayer, gateLayer);
  const evidenceSummary = buildEvidenceSummary(evidenceCatalog, laneEvidenceEntries, orchestration);
  const evidencePayload = buildEvidencePayload({
    actorRole,
    session,
    decisionAssistance,
    knowledge,
    orchestration,
    entries: laneEvidenceEntries,
  });

  return {
    updatedAt,
    actor_role: actorRole,
    evidence_surface_kind: 'execution-evidence-ledger',
    execution_evidence_ledger: {
      evidence_surface_kind: 'controlled_execution_evidence_ledger',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      orchestration_loop_state: orchestration.orchestration_loop_state,
      intervention_summary: interventionLayer.intervention_summary,
      execution_gate_summary: gateLayer.execution_gate_summary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
      authorization_outcome: authorization.execution_authorization_outcome?.outcome || 'authorization_withheld',
      release_decision: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
    },
    evidence_catalog: evidenceCatalog,
    lane_evidence_entries: laneEvidenceEntries,
    evidence_guardrails: evidenceGuardrails,
    evidence_summary: evidenceSummary,
    evidence_payload: evidencePayload,
  };
}

module.exports = {
  buildExecutionEvidenceLedgerLayer,
  buildEvidenceCatalog,
  buildLaneEvidenceEntries,
  buildEvidenceGuardrails,
  buildEvidenceSummary,
  buildEvidencePayload,
};
