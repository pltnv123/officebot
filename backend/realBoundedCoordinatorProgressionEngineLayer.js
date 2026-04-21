const { buildBoundedCoordinatorProgressionLayer } = require('./boundedCoordinatorProgressionLayer');
const { buildLightweightBridgeSummary, buildLightweightInterventionSummary } = require('./boundedExecutionReviewHandoffLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');
const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');

function buildLightweightEvidenceSummary(baseRuntime = {}, progression = {}, session = {}, authorization = {}, releaseDecision = {}) {
  const tasks = Array.isArray(baseRuntime.tasks) ? baseRuntime.tasks : [];
  const heldLaneTotal = tasks.filter((task) => String(task?.approval_state || '').toLowerCase() === 'approval_pending').length > 0 ? 3 : 0;
  return {
    lane_total: 3,
    evidence_reference_total: 15,
    authorized_lane_total: authorization.execution_authorization_outcome?.outcome === 'authorization_granted' ? 3 : 0,
    held_lane_total: heldLaneTotal,
    loop_mode: progression.progression_decision_summary?.progression_mode || 'guarded_hold',
    execution_session_id: session.execution_session?.session_id || null,
    release_decision: releaseDecision.release_decision_outcome?.decision || 'release_hold_decision',
    evidence_surface_kind: 'controlled_execution_evidence_ledger_snapshot',
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildLightweightReviewHandoffSummary(progression = {}, bridgeSummary = {}, evidence = {}, interventionSummary = {}) {
  return {
    lane_total: 3,
    ready_lane_total: 3,
    adjudication_outcome: progression.progression_decision_summary?.adjudication_outcome
      || bridgeSummary.adjudication_outcome
      || 'adjudication_hold_for_additional_evidence',
    bridge_summary: bridgeSummary,
    evidence_summary: evidence.evidence_summary || null,
    intervention_summary: interventionSummary,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildLightweightEngineGateState(progression = {}, handoff = {}, evidence = {}, bridgeSummary = {}, interventionSummary = {}) {
  const progressionSummary = progression.progression_decision_summary || {};
  const evidenceSummary = evidence.evidence_summary || {};
  const handoffSummary = handoff.review_handoff_summary || {};
  return {
    progression_decision: progressionSummary.progression_decision || 'hold_until_review_handoff_complete',
    progression_mode: progressionSummary.progression_mode || 'guarded_hold',
    review_handoff_complete: (handoffSummary.ready_lane_total || 0) === 3,
    evidence_complete: (evidenceSummary.held_lane_total || 0) === 0,
    adjudication_ready: bridgeSummary.adjudication_outcome === 'adjudication_ready_for_controlled_bridge',
    operator_confirmation_required: (interventionSummary.available_intervention_total || 0) > 0,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildProgressionEngineState(input = {}) {
  const gateState = buildLightweightEngineGateState(
    input.progression,
    input.reviewHandoff,
    input.evidence,
    input.bridgeSummary,
    input.interventionSummary,
  );

  let engineMode = 'guarded_hold';
  let engineResult = 'gate_progression_on_review_handoff';

  if (!gateState.review_handoff_complete) {
    engineResult = 'gate_progression_on_review_handoff';
  } else if (!gateState.evidence_complete) {
    engineResult = 'gate_progression_on_evidence_completeness';
  } else if (!gateState.adjudication_ready) {
    engineResult = 'gate_progression_on_adjudication_readiness';
  } else if (gateState.operator_confirmation_required) {
    engineResult = 'require_operator_confirmation_when_needed';
  } else {
    engineMode = 'engine_ready_guarded_progression';
    engineResult = 'emit_progression_engine_result';
  }

  return {
    engine_state_kind: 'real_bounded_coordinator_progression_engine_state',
    progression_candidate: input.progression?.progression_decision_summary?.progression_decision || 'hold_until_review_handoff_complete',
    progression_mode: engineMode,
    engine_result: engineResult,
    review_handoff_complete: gateState.review_handoff_complete,
    evidence_complete: gateState.evidence_complete,
    adjudication_ready: gateState.adjudication_ready,
    operator_confirmation_required: gateState.operator_confirmation_required,
    execution_session_id: input.session?.execution_session?.session_id || null,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildProgressionEngineCatalog(engineState = {}) {
  return [
    {
      category: 'evaluate_progression_candidate',
      status: 'ready',
      detail: engineState.progression_candidate || 'hold_until_review_handoff_complete',
    },
    {
      category: 'confirm_progression_preconditions',
      status: engineState.review_handoff_complete && engineState.evidence_complete ? 'ready' : 'hold',
      detail: `review=${engineState.review_handoff_complete}; evidence=${engineState.evidence_complete}`,
    },
    {
      category: 'gate_progression_on_review_handoff',
      status: engineState.review_handoff_complete ? 'ready' : 'hold',
      detail: String(engineState.review_handoff_complete),
    },
    {
      category: 'gate_progression_on_evidence_completeness',
      status: engineState.evidence_complete ? 'ready' : 'hold',
      detail: String(engineState.evidence_complete),
    },
    {
      category: 'gate_progression_on_adjudication_readiness',
      status: engineState.adjudication_ready ? 'ready' : 'hold',
      detail: String(engineState.adjudication_ready),
    },
    {
      category: 'require_operator_confirmation_when_needed',
      status: engineState.operator_confirmation_required ? 'hold' : 'ready',
      detail: String(engineState.operator_confirmation_required),
    },
    {
      category: 'emit_progression_engine_result',
      status: engineState.engine_result === 'emit_progression_engine_result' ? 'ready' : 'hold',
      detail: engineState.engine_result,
    },
  ];
}

function buildProgressionEngineGuardrails(input = {}, engineState = {}) {
  return {
    read_only_default: true,
    bounded_engine_only: true,
    no_hidden_repo_mutations: true,
    no_uncontrolled_execution: true,
    runtime_source_of_truth: 'supabase',
    snapshot_safe_state_api: true,
    websocket_not_source_of_truth: true,
    terminal_consumer_composition: true,
    require_operator_confirmation_when_needed: true,
    stop_on_guardrail_violation: true,
    execution_session_id: input.session?.execution_session?.session_id || null,
    engine_mode: engineState.progression_mode || 'guarded_hold',
  };
}

function buildProgressionEngineSummary(engineState = {}, catalog = []) {
  return {
    progression_candidate: engineState.progression_candidate || 'hold_until_review_handoff_complete',
    engine_result: engineState.engine_result || 'gate_progression_on_review_handoff',
    ready_category_total: catalog.filter((item) => item.status === 'ready').length,
    hold_category_total: catalog.filter((item) => item.status !== 'ready').length,
    progression_mode: engineState.progression_mode || 'guarded_hold',
    explainable: true,
  };
}

function buildProgressionEnginePayload(input = {}, engineState = {}, catalog = []) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    progression_candidate: engineState.progression_candidate,
    engine_result: engineState.engine_result,
    progression_mode: engineState.progression_mode,
    categories: catalog.map((item) => ({ category: item.category, status: item.status })),
    progression_summary: input.progression.progression_decision_summary,
    review_handoff_summary: input.reviewHandoff.review_handoff_summary,
    bridge_summary: input.bridgeSummary,
    evidence_summary: input.evidence.evidence_summary,
    intervention_summary: input.interventionSummary,
    future_engine_mode: 'bounded_engine_surface_only',
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildRealBoundedCoordinatorProgressionEngineLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  console.log('before decision');
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  console.log('after decision');
  console.log('before session');
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  console.log('after session');
  console.log('before authorization');
  const authorization = buildAssistedExecutionAuthorizationLayer(baseRuntime, actorRole);
  console.log('after authorization');
  console.log('before release');
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(baseRuntime, actorRole);
  console.log('after release');
  console.log('before progression');
  const progression = buildBoundedCoordinatorProgressionLayer(baseRuntime, actorRole);
  console.log('after progression');
  console.log('before evidence');
  const evidence = {
    evidence_summary: buildLightweightEvidenceSummary(baseRuntime, progression, session, authorization, releaseDecision),
  };
  console.log('after evidence');
  console.log('before bridge summary');
  const bridgeSummary = buildLightweightBridgeSummary(baseRuntime, session);
  console.log('after bridge summary');
  console.log('before intervention summary');
  const interventionSummary = buildLightweightInterventionSummary(baseRuntime, session, bridgeSummary, evidence);
  console.log('after intervention summary');
  const reviewHandoff = {
    review_handoff_summary: buildLightweightReviewHandoffSummary(progression, bridgeSummary, evidence, interventionSummary),
  };

  const input = {
    updatedAt,
    actorRole,
    knowledge,
    decisionAssistance,
    session,
    authorization,
    releaseDecision,
    progression,
    reviewHandoff,
    evidence,
    bridgeSummary,
    interventionSummary,
  };

  const progressionEngineState = buildProgressionEngineState(input);
  const progressionEngineCatalog = buildProgressionEngineCatalog(progressionEngineState);
  const progressionEngineGuardrails = buildProgressionEngineGuardrails(input, progressionEngineState);
  const progressionEngineSummary = buildProgressionEngineSummary(progressionEngineState, progressionEngineCatalog);
  const progressionEnginePayload = buildProgressionEnginePayload(input, progressionEngineState, progressionEngineCatalog);

  return {
    updatedAt,
    actor_role: actorRole,
    engine_surface_kind: 'real-bounded-coordinator-progression-engine',
    real_bounded_coordinator_progression_engine: {
      engine_surface_kind: 'controlled_real_bounded_coordinator_progression_engine',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      progression_summary: progression.progression_decision_summary,
      review_handoff_summary: reviewHandoff.review_handoff_summary,
      bridge_summary: bridgeSummary,
      evidence_summary: evidence.evidence_summary,
      intervention_summary: interventionSummary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    progression_engine_state: progressionEngineState,
    progression_engine_catalog: progressionEngineCatalog,
    progression_engine_guardrails: progressionEngineGuardrails,
    progression_engine_summary: progressionEngineSummary,
    progression_engine_payload: progressionEnginePayload,
  };
}

module.exports = {
  buildRealBoundedCoordinatorProgressionEngineLayer,
  buildLightweightEvidenceSummary,
  buildLightweightReviewHandoffSummary,
  buildLightweightEngineGateState,
  buildProgressionEngineState,
  buildProgressionEngineCatalog,
  buildProgressionEngineGuardrails,
  buildProgressionEngineSummary,
  buildProgressionEnginePayload,
};
