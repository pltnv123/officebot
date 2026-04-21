const { buildExecutionEvidenceLedgerLayer } = require('./executionEvidenceLedgerLayer');
const { buildOperatorInterventionControlLayer } = require('./operatorInterventionControlLayer');
const { buildExecutorCoordinationExecutionGateLayer } = require('./executorCoordinationExecutionGateLayer');
const { buildExecutorCoordinationDecisionPolicyLayer } = require('./executorCoordinationDecisionPolicyLayer');
const { buildBackendExecutorRuntimeLayer } = require('./backendExecutorRuntimeLayer');
const { buildIosExecutorRuntimeLayer } = require('./iosExecutorRuntimeLayer');
const { buildQaExecutorRuntimeLayer } = require('./qaExecutorRuntimeLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

const LANES = ['backend', 'ios', 'qa'];

function buildAdjudicationInputs(lane, evidenceEntry = {}, runtime = {}, intervention = {}, gate = {}) {
  const runtimeSummary = runtime[`${lane}_runtime_summary`] || {};
  return {
    lane,
    adjudication_input_kind: 'lane_result_adjudication_input',
    authorized: evidenceEntry.authorized === true,
    gate_outcome: gate.gate_outcome || evidenceEntry.gate_outcome || 'hold',
    gate_category: gate.gate_category || evidenceEntry.gate_category || 'hold_on_policy_guardrail_violation',
    execution_mode: evidenceEntry.execution_mode || runtimeSummary.execution_mode || 'authorization_hold',
    result_collection_state: runtimeSummary.result_collection_state || runtimeSummary.last_result_status || 'pending',
    available_interventions: evidenceEntry.available_interventions || (Array.isArray(intervention.actions) ? intervention.actions.filter((action) => action.available).map((action) => action.action) : []),
    contract_blocker_total: evidenceEntry.evidence_summary?.contract_blocker_total || 0,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildAdjudicationOutcome(inputs = [], session = {}) {
  const readyLanes = inputs.filter((item) => item.authorized && item.gate_outcome === 'allow');
  const heldLanes = inputs.filter((item) => item.gate_outcome === 'hold');
  const deniedLanes = inputs.filter((item) => item.gate_outcome === 'deny');

  return {
    adjudication_kind: 'governed_lane_result_adjudication',
    execution_session_id: session.execution_session?.session_id || null,
    overall_outcome: deniedLanes.length > 0
      ? 'adjudication_hold_due_to_denied_lane'
      : readyLanes.length === inputs.length && inputs.length > 0
        ? 'adjudication_ready_for_controlled_bridge'
        : 'adjudication_hold_for_additional_evidence',
    ready_lane_total: readyLanes.length,
    held_lane_total: heldLanes.length,
    denied_lane_total: deniedLanes.length,
    lane_outcomes: inputs.map((item) => ({
      lane: item.lane,
      outcome: item.gate_outcome === 'allow'
        ? 'lane_ready'
        : item.gate_outcome === 'deny'
          ? 'lane_denied'
          : 'lane_held',
      rationale: item.gate_category,
    })),
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildAdjudicationGuardrails(inputs = [], evidenceLedger = {}, interventionLayer = {}, gateLayer = {}) {
  return inputs.map((item) => ({
    lane: item.lane,
    guardrails: {
      read_only_default: true,
      adjudication_only_no_execution: true,
      no_hidden_repo_mutations: true,
      no_uncontrolled_execution: true,
      runtime_source_of_truth: 'supabase',
      evidence_surface_kind: evidenceLedger.execution_evidence_ledger?.evidence_surface_kind || 'controlled_execution_evidence_ledger',
      intervention_surface_kind: interventionLayer.operator_intervention_control?.intervention_surface_kind || 'controlled_operator_intervention_control',
      execution_gate_surface_kind: gateLayer.executor_coordination_execution_gate?.gate_surface_kind || 'controlled_executor_coordination_execution_gate',
    },
  }));
}

function buildAdjudicationSummary(inputs = [], outcome = {}) {
  return {
    lane_total: inputs.length,
    ready_lane_total: outcome.ready_lane_total || 0,
    held_lane_total: outcome.held_lane_total || 0,
    denied_lane_total: outcome.denied_lane_total || 0,
    overall_outcome: outcome.overall_outcome || 'adjudication_hold_for_additional_evidence',
    explainable: true,
  };
}

function buildAdjudicationPayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    adjudicated_lanes: (input.inputs || []).map((item) => ({
      lane: item.lane,
      gate_outcome: item.gate_outcome,
      authorized: item.authorized,
    })),
    overall_outcome: input.outcome?.overall_outcome || 'adjudication_hold_for_additional_evidence',
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildLaneResultAdjudicationLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const evidenceLedger = buildExecutionEvidenceLedgerLayer(baseRuntime, actorRole);
  const interventionLayer = buildOperatorInterventionControlLayer(baseRuntime, actorRole);
  const gateLayer = buildExecutorCoordinationExecutionGateLayer(baseRuntime, actorRole);
  const backendRuntime = buildBackendExecutorRuntimeLayer(baseRuntime, actorRole);
  const iosRuntime = buildIosExecutorRuntimeLayer(baseRuntime, actorRole);
  const qaRuntime = buildQaExecutorRuntimeLayer(baseRuntime, actorRole);

  const runtimes = { backend: backendRuntime, ios: iosRuntime, qa: qaRuntime };
  const evidenceByLane = Object.fromEntries((evidenceLedger.lane_evidence_entries || []).map((item) => [item.lane, item]));
  const interventionByLane = Object.fromEntries((interventionLayer.intervention_actions || []).map((item) => [item.lane, item]));
  const gateByLane = Object.fromEntries((gateLayer.execution_gate_outcome || []).map((item) => [item.lane, item]));

  const adjudicationInputs = LANES.map((lane) => buildAdjudicationInputs(
    lane,
    evidenceByLane[lane] || {},
    runtimes[lane],
    interventionByLane[lane] || {},
    gateByLane[lane] || {},
  ));
  const adjudicationOutcome = buildAdjudicationOutcome(adjudicationInputs, session);
  const adjudicationGuardrails = buildAdjudicationGuardrails(adjudicationInputs, evidenceLedger, interventionLayer, gateLayer);
  const adjudicationSummary = buildAdjudicationSummary(adjudicationInputs, adjudicationOutcome);
  const adjudicationPayload = buildAdjudicationPayload({ actorRole, session, decisionAssistance, knowledge, inputs: adjudicationInputs, outcome: adjudicationOutcome });

  return {
    updatedAt,
    actor_role: actorRole,
    adjudication_surface_kind: 'lane-result-adjudication',
    lane_result_adjudication: {
      adjudication_surface_kind: 'controlled_lane_result_adjudication',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      evidence_summary: evidenceLedger.evidence_summary,
      intervention_summary: interventionLayer.intervention_summary,
      execution_gate_summary: gateLayer.execution_gate_summary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    adjudication_inputs: adjudicationInputs,
    adjudication_outcome: adjudicationOutcome,
    adjudication_guardrails: adjudicationGuardrails,
    adjudication_summary: adjudicationSummary,
    adjudication_payload: adjudicationPayload,
  };
}

module.exports = {
  buildLaneResultAdjudicationLayer,
  buildAdjudicationInputs,
  buildAdjudicationOutcome,
  buildAdjudicationGuardrails,
  buildAdjudicationSummary,
  buildAdjudicationPayload,
};
