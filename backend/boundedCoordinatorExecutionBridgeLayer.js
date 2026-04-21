const { buildExecutorCoordinationDecisionPolicyLayer } = require('./executorCoordinationDecisionPolicyLayer');
const { buildExecutorCoordinationExecutionGateLayer } = require('./executorCoordinationExecutionGateLayer');
const { buildOperatorInterventionControlLayer } = require('./operatorInterventionControlLayer');
const { buildExecutionEvidenceLedgerLayer } = require('./executionEvidenceLedgerLayer');
const { buildLaneResultAdjudicationLayer } = require('./laneResultAdjudicationLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildExecutionBridgePlan(policy = {}, gate = {}, intervention = {}, evidence = {}, adjudication = {}) {
  return {
    plan_kind: 'bounded_coordinator_execution_bridge_plan',
    bridge_target: 'controlled_multi_lane_execution',
    selected_policy_count: Array.isArray(policy.policy_decision_catalog) ? policy.policy_decision_catalog.length : 0,
    gate_outcome_count: Array.isArray(gate.execution_gate_outcome) ? gate.execution_gate_outcome.length : 0,
    intervention_lane_count: Array.isArray(intervention.intervention_actions) ? intervention.intervention_actions.length : 0,
    evidence_lane_count: Array.isArray(evidence.lane_evidence_entries) ? evidence.lane_evidence_entries.length : 0,
    adjudication_outcome: adjudication.adjudication_outcome?.overall_outcome || 'adjudication_hold_for_additional_evidence',
    bounded: true,
    explainable: true,
    read_only: true,
  };
}

function buildExecutionBridgeStages(policy = {}, gate = {}, intervention = {}, evidence = {}, adjudication = {}) {
  return [
    {
      stage: 'policy_selection',
      status: Array.isArray(policy.policy_decision_catalog) && policy.policy_decision_catalog.length > 0 ? 'ready' : 'hold',
      source: 'executor_coordination_decision_policy',
    },
    {
      stage: 'execution_gate_review',
      status: Array.isArray(gate.execution_gate_outcome) && gate.execution_gate_outcome.some((item) => item.gate_outcome === 'allow') ? 'ready' : 'hold',
      source: 'executor_coordination_execution_gate',
    },
    {
      stage: 'operator_control_review',
      status: Array.isArray(intervention.intervention_actions) && intervention.intervention_actions.length > 0 ? 'ready' : 'hold',
      source: 'operator_intervention_control',
    },
    {
      stage: 'evidence_ledger_review',
      status: Array.isArray(evidence.lane_evidence_entries) && evidence.lane_evidence_entries.length > 0 ? 'ready' : 'hold',
      source: 'execution_evidence_ledger',
    },
    {
      stage: 'result_adjudication',
      status: adjudication.adjudication_outcome?.overall_outcome === 'adjudication_ready_for_controlled_bridge' ? 'ready' : 'hold',
      source: 'lane_result_adjudication',
    },
  ];
}

function buildExecutionBridgeGuardrails(stages = [], session = {}) {
  return {
    read_only_default: true,
    bounded_execution_bridge_only: true,
    no_hidden_repo_mutations: true,
    no_uncontrolled_execution: true,
    runtime_source_of_truth: 'supabase',
    snapshot_safe_state_api: true,
    websocket_not_source_of_truth: true,
    execution_session_id: session.execution_session?.session_id || null,
    ready_stage_total: stages.filter((stage) => stage.status === 'ready').length,
    hold_stage_total: stages.filter((stage) => stage.status !== 'ready').length,
  };
}

function buildExecutionBridgeSummary(plan = {}, stages = []) {
  return {
    stage_total: stages.length,
    ready_stage_total: stages.filter((stage) => stage.status === 'ready').length,
    hold_stage_total: stages.filter((stage) => stage.status !== 'ready').length,
    adjudication_outcome: plan.adjudication_outcome || 'adjudication_hold_for_additional_evidence',
    explainable: true,
  };
}

function buildExecutionBridgePayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    adjudication_outcome: input.plan?.adjudication_outcome || 'adjudication_hold_for_additional_evidence',
    bridge_stages: (input.stages || []).map((stage) => ({ stage: stage.stage, status: stage.status })),
    bounded: true,
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildBoundedCoordinatorExecutionBridgeLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const policy = buildExecutorCoordinationDecisionPolicyLayer(baseRuntime, actorRole);
  const gate = buildExecutorCoordinationExecutionGateLayer(baseRuntime, actorRole);
  const intervention = buildOperatorInterventionControlLayer(baseRuntime, actorRole);
  const evidence = buildExecutionEvidenceLedgerLayer(baseRuntime, actorRole);
  const adjudication = buildLaneResultAdjudicationLayer(baseRuntime, actorRole);

  const executionBridgePlan = buildExecutionBridgePlan(policy, gate, intervention, evidence, adjudication);
  const executionBridgeStages = buildExecutionBridgeStages(policy, gate, intervention, evidence, adjudication);
  const executionBridgeGuardrails = buildExecutionBridgeGuardrails(executionBridgeStages, session);
  const executionBridgeSummary = buildExecutionBridgeSummary(executionBridgePlan, executionBridgeStages);
  const executionBridgePayload = buildExecutionBridgePayload({ actorRole, session, decisionAssistance, knowledge, plan: executionBridgePlan, stages: executionBridgeStages });

  return {
    updatedAt,
    actor_role: actorRole,
    bridge_surface_kind: 'bounded-coordinator-execution-bridge',
    bounded_coordinator_execution_bridge: {
      bridge_surface_kind: 'controlled_bounded_coordinator_execution_bridge',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      decision_policy_summary: policy.policy_decision_summary,
      execution_gate_summary: gate.execution_gate_summary,
      intervention_summary: intervention.intervention_summary,
      evidence_summary: evidence.evidence_summary,
      adjudication_summary: adjudication.adjudication_summary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    execution_bridge_plan: executionBridgePlan,
    execution_bridge_guardrails: executionBridgeGuardrails,
    execution_bridge_stages: executionBridgeStages,
    execution_bridge_summary: executionBridgeSummary,
    execution_bridge_payload: executionBridgePayload,
  };
}

module.exports = {
  buildBoundedCoordinatorExecutionBridgeLayer,
  buildExecutionBridgePlan,
  buildExecutionBridgeGuardrails,
  buildExecutionBridgeStages,
  buildExecutionBridgeSummary,
  buildExecutionBridgePayload,
};
