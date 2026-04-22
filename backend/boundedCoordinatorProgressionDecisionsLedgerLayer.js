const { buildRealBoundedCoordinatorProgressionEngineLayer } = require('./realBoundedCoordinatorProgressionEngineLayer');
const { buildBoundedCoordinatorProgressionLayer } = require('./boundedCoordinatorProgressionLayer');
const { buildLightweightBridgeSummary, buildLightweightInterventionSummary } = require('./boundedExecutionReviewHandoffLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');
const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');

function buildLightweightLedgerEvidenceSummary(baseRuntime = {}, progression = {}, session = {}, authorization = {}, releaseDecision = {}) {
  const tasks = Array.isArray(baseRuntime.tasks) ? baseRuntime.tasks : [];
  const heldLaneTotal = tasks.filter((task) => String(task?.approval_state || '').toLowerCase() === 'approval_pending').length > 0 ? 3 : 0;
  return {
    lane_total: 3,
    held_lane_total: heldLaneTotal,
    authorized_lane_total: authorization.execution_authorization_outcome?.outcome === 'authorization_granted' ? 3 : 0,
    execution_session_id: session.execution_session?.session_id || null,
    release_decision: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
    progression_mode: progression.progression_decision_summary?.progression_mode || 'guarded_hold',
    evidence_surface_kind: 'controlled_execution_evidence_ledger_snapshot',
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildProgressionDecisionRecords(input = {}) {
  const engineState = input.engine.progression_engine_state || {};
  const evidenceSummary = input.evidenceSummary || {};
  return [
    {
      category: 'progression_candidate_evaluation_record',
      status: 'recorded',
      decision: engineState.progression_candidate || 'hold_until_review_handoff_complete',
      detail: input.progression.progression_decision_summary?.progression_mode || 'guarded_hold',
    },
    {
      category: 'progression_precondition_check_record',
      status: 'recorded',
      decision: engineState.review_handoff_complete && engineState.evidence_complete ? 'preconditions_ready' : 'preconditions_held',
      detail: `review=${engineState.review_handoff_complete}; evidence=${engineState.evidence_complete}`,
    },
    {
      category: 'progression_gate_record',
      status: 'recorded',
      decision: engineState.engine_result || 'gate_progression_on_review_handoff',
      detail: input.bridgeSummary.adjudication_outcome || 'adjudication_hold_for_additional_evidence',
    },
    {
      category: 'operator_confirmation_record',
      status: 'recorded',
      decision: engineState.operator_confirmation_required ? 'operator_confirmation_required' : 'operator_confirmation_not_required',
      detail: String(engineState.operator_confirmation_required),
    },
    {
      category: 'progression_result_record',
      status: 'recorded',
      decision: engineState.engine_result || 'gate_progression_on_review_handoff',
      detail: engineState.progression_mode || 'guarded_hold',
    },
    {
      category: 'no_op_progression_record',
      status: 'recorded',
      decision: evidenceSummary.held_lane_total > 0 ? 'no_op_progression' : 'no_noop_needed',
      detail: `held_lane_total=${evidenceSummary.held_lane_total || 0}`,
    },
    {
      category: 'guarded_hold_record',
      status: 'recorded',
      decision: engineState.progression_mode === 'guarded_hold' ? 'guarded_hold' : 'guarded_progression_ready',
      detail: engineState.engine_result || 'gate_progression_on_review_handoff',
    },
  ];
}

function buildProgressionDecisionLog(records = [], input = {}) {
  return records.map((record, index) => ({
    sequence: index + 1,
    record_category: record.category,
    decision: record.decision,
    status: record.status,
    runtime_source: 'supabase',
    execution_session_id: input.session?.execution_session?.session_id || null,
    actor_role: input.actorRole,
    explainable: true,
    governed: true,
    read_only: true,
  }));
}

function buildProgressionDecisionGuardrails(input = {}) {
  return {
    read_only_default: true,
    decision_log_only: true,
    no_hidden_repo_mutations: true,
    no_uncontrolled_execution: true,
    runtime_source_of_truth: 'supabase',
    snapshot_safe_state_api: true,
    websocket_not_source_of_truth: true,
    terminal_consumer_composition: true,
    staged_or_guarded_records_only: true,
    execution_session_id: input.session?.execution_session?.session_id || null,
  };
}

function buildProgressionDecisionSummary(records = [], log = [], engine = {}) {
  return {
    record_total: records.length,
    log_entry_total: log.length,
    guarded_hold_total: records.filter((record) => record.decision === 'guarded_hold').length,
    no_op_total: records.filter((record) => record.decision === 'no_op_progression').length,
    engine_result: engine.progression_engine_state?.engine_result || 'gate_progression_on_review_handoff',
    explainable: true,
  };
}

function buildProgressionDecisionPayload(input = {}, records = [], log = [], summary = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    engine_result: input.engine.progression_engine_state?.engine_result || 'gate_progression_on_review_handoff',
    progression_candidate: input.engine.progression_engine_state?.progression_candidate || 'hold_until_review_handoff_complete',
    record_categories: records.map((record) => record.category),
    log_entries: log.map((entry) => ({ sequence: entry.sequence, category: entry.record_category })),
    summary,
    future_logging_mode: 'bounded_progression_decision_log_only',
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildBoundedCoordinatorProgressionDecisionsLedgerLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const authorization = buildAssistedExecutionAuthorizationLayer(baseRuntime, actorRole);
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(baseRuntime, actorRole);
  const progression = buildBoundedCoordinatorProgressionLayer(baseRuntime, actorRole);
  const bridgeSummary = buildLightweightBridgeSummary(baseRuntime, session);
  const evidenceSummary = buildLightweightLedgerEvidenceSummary(baseRuntime, progression, session, authorization, releaseDecision);
  const interventionSummary = buildLightweightInterventionSummary(baseRuntime, session, bridgeSummary, { evidence_summary: evidenceSummary });
  const engine = buildRealBoundedCoordinatorProgressionEngineLayer(baseRuntime, actorRole);

  const input = {
    updatedAt,
    actorRole,
    knowledge,
    decisionAssistance,
    session,
    authorization,
    releaseDecision,
    progression,
    bridgeSummary,
    evidenceSummary,
    interventionSummary,
    engine,
  };

  const progressionDecisionRecords = buildProgressionDecisionRecords(input);
  const progressionDecisionLog = buildProgressionDecisionLog(progressionDecisionRecords, input);
  const progressionDecisionGuardrails = buildProgressionDecisionGuardrails(input);
  const progressionDecisionSummary = buildProgressionDecisionSummary(progressionDecisionRecords, progressionDecisionLog, engine);
  const progressionDecisionPayload = buildProgressionDecisionPayload(input, progressionDecisionRecords, progressionDecisionLog, progressionDecisionSummary);

  return {
    updatedAt,
    actor_role: actorRole,
    ledger_surface_kind: 'bounded-coordinator-progression-decisions-ledger',
    bounded_coordinator_progression_decisions_ledger: {
      ledger_surface_kind: 'controlled_bounded_coordinator_progression_decisions_ledger',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      progression_summary: progression.progression_decision_summary,
      engine_summary: engine.progression_engine_summary,
      bridge_summary: bridgeSummary,
      evidence_summary: evidenceSummary,
      intervention_summary: interventionSummary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    progression_decision_records: progressionDecisionRecords,
    progression_decision_log: progressionDecisionLog,
    progression_decision_guardrails: progressionDecisionGuardrails,
    progression_decision_summary: progressionDecisionSummary,
    progression_decision_payload: progressionDecisionPayload,
  };
}

module.exports = {
  buildBoundedCoordinatorProgressionDecisionsLedgerLayer,
  buildLightweightLedgerEvidenceSummary,
  buildProgressionDecisionRecords,
  buildProgressionDecisionLog,
  buildProgressionDecisionGuardrails,
  buildProgressionDecisionSummary,
  buildProgressionDecisionPayload,
};
