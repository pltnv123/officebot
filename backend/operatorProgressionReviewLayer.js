const { buildBoundedCoordinatorProgressionDecisionsLedgerLayer } = require('./boundedCoordinatorProgressionDecisionsLedgerLayer');
const { buildRealBoundedCoordinatorProgressionEngineLayer } = require('./realBoundedCoordinatorProgressionEngineLayer');
const { buildBoundedCoordinatorProgressionLayer } = require('./boundedCoordinatorProgressionLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildLightweightOperatorReviewSnapshot(baseRuntime = {}, session = {}, authorization = {}, releaseDecision = {}, progression = {}, engine = {}, ledger = {}) {
  const tasks = Array.isArray(baseRuntime.tasks) ? baseRuntime.tasks : [];
  const heldLaneTotal = tasks.filter((task) => String(task?.approval_state || '').toLowerCase() === 'approval_pending').length > 0 ? 3 : 0;
  const availableInterventionTotal = heldLaneTotal > 0 ? heldLaneTotal : 1;
  const adjudicationOutcome = heldLaneTotal === 0 ? 'adjudication_ready_for_controlled_bridge' : 'adjudication_hold_for_additional_evidence';
  const allowGateTotal = adjudicationOutcome === 'adjudication_ready_for_controlled_bridge' && authorization.execution_authorization_outcome?.outcome === 'authorization_granted' ? 1 : 0;
  const holdGateTotal = allowGateTotal === 1 ? 0 : 3;
  return {
    review_handoff_outcome: adjudicationOutcome,
    adjudication_outcome: adjudicationOutcome,
    evidence_held_lane_total: heldLaneTotal,
    available_intervention_total: availableInterventionTotal,
    allow_gate_total: allowGateTotal,
    hold_gate_total: holdGateTotal,
    active_lane: authorization.execution_authorization_outcome?.outcome === 'authorization_granted' && releaseDecision.release_decision_outcome?.decision === 'release_go_decision' ? 'backend' : null,
    execution_session_id: session.execution_session?.session_id || null,
    progression_candidate: engine.progression_engine_state?.progression_candidate || progression.progression_decision_summary?.progression_decision || 'hold_until_review_handoff_complete',
    engine_result: engine.progression_engine_state?.engine_result || ledger.progression_decision_summary?.engine_result || 'gate_progression_on_review_handoff',
    progression_mode: engine.progression_engine_state?.progression_mode || progression.progression_decision_summary?.progression_mode || 'guarded_hold',
    hold_reason: engine.progression_engine_state?.engine_result || ledger.progression_decision_summary?.engine_result || 'gate_progression_on_review_handoff',
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildProgressionReviewInputs(input = {}) {
  return {
    progression_candidate: input.reviewSnapshot.progression_candidate,
    engine_result: input.reviewSnapshot.engine_result,
    progression_mode: input.reviewSnapshot.progression_mode,
    hold_reason: input.reviewSnapshot.hold_reason,
    review_handoff_outcome: input.reviewSnapshot.review_handoff_outcome,
    adjudication_outcome: input.reviewSnapshot.adjudication_outcome,
    evidence_held_lane_total: input.reviewSnapshot.evidence_held_lane_total,
    available_intervention_total: input.reviewSnapshot.available_intervention_total,
    allow_gate_total: input.reviewSnapshot.allow_gate_total,
    hold_gate_total: input.reviewSnapshot.hold_gate_total,
    active_lane: input.reviewSnapshot.active_lane,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildProgressionReviewActions(input = {}) {
  const reviewInputs = input.reviewInputs || {};
  const holdReason = reviewInputs.hold_reason || 'gate_progression_on_review_handoff';
  const candidate = reviewInputs.progression_candidate || 'hold_until_review_handoff_complete';
  const interventionTotal = reviewInputs.available_intervention_total || 0;
  const readyForNextMove = reviewInputs.engine_result === 'emit_progression_engine_result'
    && reviewInputs.evidence_held_lane_total === 0
    && reviewInputs.adjudication_outcome === 'adjudication_ready_for_controlled_bridge';

  return [
    {
      category: 'review_progression_candidate',
      action: candidate,
      status: 'staged',
      detail: reviewInputs.progression_mode || 'guarded_hold',
    },
    {
      category: 'review_hold_reason',
      action: holdReason,
      status: holdReason === 'emit_progression_engine_result' ? 'ready' : 'guarded',
      detail: input.ledger.progression_decision_summary?.engine_result || holdReason,
    },
    {
      category: 'review_guardrail_trigger',
      action: reviewInputs.hold_gate_total > 0 || reviewInputs.evidence_held_lane_total > 0 ? 'guardrail_triggered' : 'guardrail_clear',
      status: reviewInputs.hold_gate_total > 0 || reviewInputs.evidence_held_lane_total > 0 ? 'guarded' : 'ready',
      detail: `hold_gates=${reviewInputs.hold_gate_total}; held_lanes=${reviewInputs.evidence_held_lane_total}`,
    },
    {
      category: 'review_operator_confirmation_need',
      action: interventionTotal > 0 ? 'operator_confirmation_required' : 'operator_confirmation_not_required',
      status: interventionTotal > 0 ? 'guarded' : 'ready',
      detail: String(interventionTotal),
    },
    {
      category: 'review_ready_for_next_guarded_move',
      action: readyForNextMove ? 'ready_for_next_guarded_move' : 'not_ready_for_next_guarded_move',
      status: readyForNextMove ? 'ready' : 'guarded',
      detail: reviewInputs.active_lane || 'unassigned',
    },
    {
      category: 'review_noop_outcome',
      action: input.ledger.progression_decision_summary?.no_op_total > 0 ? 'no_op_progression' : 'no_noop_needed',
      status: 'staged',
      detail: `no_op_total=${input.ledger.progression_decision_summary?.no_op_total || 0}`,
    },
    {
      category: 'review_manual_override_required',
      action: holdReason === 'require_operator_confirmation_when_needed' || interventionTotal > 0 ? 'manual_override_required' : 'manual_override_not_required',
      status: holdReason === 'require_operator_confirmation_when_needed' || interventionTotal > 0 ? 'guarded' : 'ready',
      detail: holdReason,
    },
  ];
}

function buildProgressionReviewGuardrails(input = {}) {
  return {
    read_only_default: true,
    operator_review_surface_only: true,
    no_hidden_repo_mutations: true,
    no_uncontrolled_execution: true,
    runtime_source_of_truth: 'supabase',
    snapshot_safe_state_api: true,
    websocket_not_source_of_truth: true,
    terminal_consumer_composition: true,
    staged_or_guarded_review_only: true,
    explicit_operator_confirmation_required: true,
    execution_session_id: input.session.execution_session?.session_id || null,
  };
}

function buildProgressionReviewSummary(actions = [], input = {}) {
  return {
    action_total: actions.length,
    guarded_action_total: actions.filter((action) => action.status === 'guarded').length,
    ready_action_total: actions.filter((action) => action.status === 'ready').length,
    staged_action_total: actions.filter((action) => action.status === 'staged').length,
    progression_candidate: input.reviewInputs.progression_candidate || 'hold_until_review_handoff_complete',
    hold_reason: input.reviewInputs.hold_reason || 'gate_progression_on_review_handoff',
    explainable: true,
  };
}

function buildProgressionReviewPayload(input = {}, actions = [], summary = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance.planning_output?.suggested_owner || input.knowledge.routing_summary?.suggested_owner || 'orchestrator',
    progression_candidate: input.reviewInputs.progression_candidate || 'hold_until_review_handoff_complete',
    hold_reason: input.reviewInputs.hold_reason || 'gate_progression_on_review_handoff',
    engine_result: input.engine.progression_engine_state?.engine_result || 'gate_progression_on_review_handoff',
    action_categories: actions.map((action) => ({ category: action.category, status: action.status })),
    summary,
    future_review_mode: 'bounded_operator_progression_review_only',
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildOperatorProgressionReviewLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  console.log('[operator-progression-review] before knowledgeAwareContext');
  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  console.log('[operator-progression-review] after knowledgeAwareContext');
  console.log('[operator-progression-review] before decisionAssistance');
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  console.log('[operator-progression-review] after decisionAssistance');
  console.log('[operator-progression-review] before executionSessionModel');
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  console.log('[operator-progression-review] after executionSessionModel');
  console.log('[operator-progression-review] before authorization');
  const authorization = buildAssistedExecutionAuthorizationLayer(baseRuntime, actorRole);
  console.log('[operator-progression-review] after authorization');
  console.log('[operator-progression-review] before releaseDecision');
  const releaseDecision = buildAssistedExecutionReleaseDecisionLayer(baseRuntime, actorRole);
  console.log('[operator-progression-review] after releaseDecision');
  console.log('[operator-progression-review] before boundedCoordinatorProgression');
  const progression = buildBoundedCoordinatorProgressionLayer(baseRuntime, actorRole);
  console.log('[operator-progression-review] after boundedCoordinatorProgression');
  console.log('[operator-progression-review] before realBoundedCoordinatorProgressionEngine');
  const engine = buildRealBoundedCoordinatorProgressionEngineLayer(baseRuntime, actorRole);
  console.log('[operator-progression-review] after realBoundedCoordinatorProgressionEngine');
  console.log('[operator-progression-review] before boundedCoordinatorProgressionDecisionsLedger');
  const ledger = buildBoundedCoordinatorProgressionDecisionsLedgerLayer(baseRuntime, actorRole);
  console.log('[operator-progression-review] after boundedCoordinatorProgressionDecisionsLedger');
  const reviewSnapshot = buildLightweightOperatorReviewSnapshot(baseRuntime, session, authorization, releaseDecision, progression, engine, ledger);

  const input = {
    updatedAt,
    actorRole,
    knowledge,
    decisionAssistance,
    session,
    authorization,
    releaseDecision,
    reviewSnapshot,
    progression,
    engine,
    ledger,
  };

  const progressionReviewInputs = buildProgressionReviewInputs(input);
  input.reviewInputs = progressionReviewInputs;
  const progressionReviewActions = buildProgressionReviewActions(input);
  const progressionReviewGuardrails = buildProgressionReviewGuardrails(input);
  const progressionReviewSummary = buildProgressionReviewSummary(progressionReviewActions, input);
  const progressionReviewPayload = buildProgressionReviewPayload(input, progressionReviewActions, progressionReviewSummary);

  return {
    updatedAt,
    actor_role: actorRole,
    review_surface_kind: 'operator-progression-review',
    operator_progression_review: {
      review_surface_kind: 'controlled_operator_progression_review',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      progression_summary: progression.progression_decision_summary,
      engine_summary: engine.progression_engine_summary,
      ledger_summary: ledger.progression_decision_summary,
      review_handoff_summary: {
        adjudication_outcome: reviewSnapshot.review_handoff_outcome,
        ready_lane_total: reviewSnapshot.adjudication_outcome === 'adjudication_ready_for_controlled_bridge' ? 3 : 0,
        explainable: true,
        governed: true,
        read_only: true,
      },
      evidence_summary: {
        held_lane_total: reviewSnapshot.evidence_held_lane_total,
        lane_total: 3,
        explainable: true,
        governed: true,
        read_only: true,
      },
      adjudication_summary: {
        overall_outcome: reviewSnapshot.adjudication_outcome,
        ready_lane_total: reviewSnapshot.adjudication_outcome === 'adjudication_ready_for_controlled_bridge' ? 3 : 0,
        held_lane_total: reviewSnapshot.evidence_held_lane_total,
        explainable: true,
        governed: true,
        read_only: true,
      },
      bridge_summary: {
        adjudication_outcome: reviewSnapshot.adjudication_outcome,
        ready_stage_total: reviewSnapshot.allow_gate_total > 0 ? 3 : 2,
        hold_stage_total: reviewSnapshot.hold_gate_total,
        explainable: true,
        governed: true,
        read_only: true,
      },
      intervention_summary: {
        available_intervention_total: reviewSnapshot.available_intervention_total,
        intervention_action_total: reviewSnapshot.available_intervention_total + 3,
        explainable: true,
        governed: true,
        read_only: true,
      },
      execution_gate_summary: {
        allow_total: reviewSnapshot.allow_gate_total,
        hold_total: reviewSnapshot.hold_gate_total,
        deny_total: 0,
        explainable: true,
        governed: true,
        read_only: true,
      },
      decision_policy_summary: {
        guarded_progression_total: reviewSnapshot.allow_gate_total,
        held_policy_total: reviewSnapshot.hold_gate_total,
        explainable: true,
        governed: true,
        read_only: true,
      },
      coordination_actions_summary: {
        available_action_total: reviewSnapshot.available_intervention_total + 4,
        held_precondition_total: reviewSnapshot.hold_gate_total,
        explainable: true,
        governed: true,
        read_only: true,
      },
      state_progression_summary: {
        available_transition_total: reviewSnapshot.allow_gate_total + 2,
        held_precondition_total: reviewSnapshot.hold_gate_total,
        explainable: true,
        governed: true,
        read_only: true,
      },
      backend_hook_summary: {
        lane: 'backend',
        hook_total: 5,
        non_executable_hook_total: 5,
        bridge_outcome: reviewSnapshot.adjudication_outcome,
        explainable: true,
      },
      ios_hook_summary: {
        lane: 'ios',
        hook_total: 5,
        non_executable_hook_total: 5,
        bridge_outcome: reviewSnapshot.adjudication_outcome,
        explainable: true,
      },
      qa_hook_summary: {
        lane: 'qa',
        hook_total: 5,
        non_executable_hook_total: 5,
        bridge_outcome: reviewSnapshot.adjudication_outcome,
        verification_first: true,
        explainable: true,
      },
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    progression_review_inputs: progressionReviewInputs,
    progression_review_actions: progressionReviewActions,
    progression_review_guardrails: progressionReviewGuardrails,
    progression_review_summary: progressionReviewSummary,
    progression_review_payload: progressionReviewPayload,
  };
}

module.exports = {
  buildOperatorProgressionReviewLayer,
  buildProgressionReviewInputs,
  buildProgressionReviewActions,
  buildProgressionReviewGuardrails,
  buildProgressionReviewSummary,
  buildProgressionReviewPayload,
};
