const { buildBoundedExecutionReviewHandoffLayer, buildLightweightBridgeSummary, buildLightweightInterventionSummary } = require('./boundedExecutionReviewHandoffLayer');
const { buildExecutionEvidenceLedgerLayer } = require('./executionEvidenceLedgerLayer');
const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');
const { buildAssistedExecutionAuthorizationLayer } = require('./assistedExecutionAuthorizationLayer');
const { buildAssistedExecutionReleaseDecisionLayer } = require('./assistedExecutionReleaseDecisionLayer');

const LANES = ['backend', 'ios', 'qa'];
const LANE_ORDER = ['backend', 'ios', 'qa'];

function buildLightweightAdjudicationSummary(bridgeSummary = {}, evidence = {}) {
  const evidenceSummary = evidence.evidence_summary || {};
  const heldLaneTotal = evidenceSummary.held_lane_total || 0;
  const overallOutcome = bridgeSummary.adjudication_outcome
    || (heldLaneTotal === 0 ? 'adjudication_ready_for_controlled_bridge' : 'adjudication_hold_for_additional_evidence');
  return {
    lane_total: 3,
    ready_lane_total: overallOutcome === 'adjudication_ready_for_controlled_bridge' ? 3 : Math.max(0, 3 - heldLaneTotal),
    held_lane_total: heldLaneTotal,
    denied_lane_total: 0,
    overall_outcome: overallOutcome,
    adjudication_surface_kind: 'controlled_lane_result_adjudication_snapshot',
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildLightweightProgressionHookResults(bridgeOutcome = 'adjudication_hold_for_additional_evidence') {
  const clean = bridgeOutcome === 'adjudication_ready_for_controlled_bridge';
  return Object.fromEntries(LANES.map((lane) => [lane, {
    lane,
    hook_status: clean ? 'clean_bounded_hook_result' : 'bounded_hook_hold',
    clean: clean,
    review_ready: clean,
    bounded: true,
    explainable: true,
    read_only: true,
  }]));
}

function buildProgressionInputs(runtimeState = {}, actorRole = 'orchestrator') {
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
  console.log('before handoff');
  const reviewHandoff = buildBoundedExecutionReviewHandoffLayer(baseRuntime, actorRole);
  console.log('after handoff');
  console.log('before evidence');
  const evidence = buildExecutionEvidenceLedgerLayer(baseRuntime, actorRole);
  console.log('after evidence');
  console.log('before bridge summary');
  const bridgeSummary = buildLightweightBridgeSummary(baseRuntime, session);
  console.log('after bridge summary');
  const adjudication = {
    adjudication_outcome: buildLightweightAdjudicationSummary(bridgeSummary, evidence),
    adjudication_summary: buildLightweightAdjudicationSummary(bridgeSummary, evidence),
  };
  console.log('before intervention summary');
  const interventionSummary = buildLightweightInterventionSummary(baseRuntime, session, bridgeSummary, evidence);
  console.log('after intervention summary');
  const hookResults = buildLightweightProgressionHookResults(bridgeSummary.adjudication_outcome);

  return {
    updatedAt,
    actorRole,
    baseRuntime,
    knowledge,
    decisionAssistance,
    session,
    authorization,
    releaseDecision,
    reviewHandoff,
    adjudication,
    evidence,
    bridgeSummary,
    interventionSummary,
    hookResults,
  };
}

function buildProgressionCatalog(input = {}) {
  const hookResults = input.hookResults || {};
  const adjudicationOutcome = input.adjudication?.adjudication_outcome?.overall_outcome || input.bridgeSummary?.adjudication_outcome || 'adjudication_hold_for_additional_evidence';
  const evidenceSummary = input.evidence?.evidence_summary || {};
  const interventionSummary = input.interventionSummary || {};
  const reviewSummary = input.reviewHandoff?.review_handoff_summary || {};

  return [
    {
      category: 'hold_until_review_handoff_complete',
      status: reviewSummary.ready_lane_total === 3 ? 'ready' : 'hold',
      source: 'bounded_execution_review_handoff',
      detail: reviewSummary.adjudication_outcome || adjudicationOutcome,
    },
    {
      category: 'progress_after_adjudication_ready',
      status: adjudicationOutcome === 'adjudication_ready_for_controlled_bridge' ? 'ready' : 'hold',
      source: 'lane_result_adjudication',
      detail: adjudicationOutcome,
    },
    {
      category: 'require_operator_checkpoint_before_lane_promotion',
      status: interventionSummary.available_intervention_total > 0 ? 'ready' : 'hold',
      source: 'operator_intervention_control_snapshot',
      detail: interventionSummary.loop_mode || 'governed_hold',
    },
    {
      category: 'keep_lane_order_consistency',
      status: 'ready',
      source: 'executor_orchestration_loop_lane_order',
      detail: LANE_ORDER.join(' -> '),
    },
    {
      category: 'progress_on_clean_bounded_hook_result',
      status: Object.values(hookResults).every((item) => item.clean === true) ? 'ready' : 'hold',
      source: 'bounded_execution_hook_snapshots',
      detail: Object.values(hookResults).map((item) => `${item.lane}:${item.hook_status}`).join(', '),
    },
    {
      category: 'stop_on_guardrail_violation',
      status: 'ready',
      source: 'progression_guardrails',
      detail: 'guardrail_enforced_stop',
    },
    {
      category: 'await_evidence_completion_before_progress',
      status: evidenceSummary.held_lane_total === 0 ? 'ready' : 'hold',
      source: 'execution_evidence_ledger',
      detail: `held_lane_total=${evidenceSummary.held_lane_total || 0}`,
    },
  ];
}

function buildProgressionDecisionSummary(input = {}, catalog = []) {
  const reviewSummary = input.reviewHandoff?.review_handoff_summary || {};
  const adjudicationOutcome = input.adjudication?.adjudication_outcome?.overall_outcome || input.bridgeSummary?.adjudication_outcome || 'adjudication_hold_for_additional_evidence';
  const authorizationOutcome = input.authorization?.execution_authorization_outcome?.outcome || 'authorization_withheld';
  const releaseOutcome = input.releaseDecision?.release_decision_outcome?.decision || 'release_hold_decision';
  const allReady = catalog.every((item) => item.status === 'ready');

  let progressionDecision = 'hold_until_review_handoff_complete';
  let progressionMode = 'guarded_hold';
  let activeLane = null;

  if (allReady && adjudicationOutcome === 'adjudication_ready_for_controlled_bridge' && authorizationOutcome === 'authorization_granted' && releaseOutcome === 'release_go_decision') {
    progressionDecision = 'progress_after_adjudication_ready';
    progressionMode = 'staged_guarded_progression';
    activeLane = LANE_ORDER[0];
  } else if (authorizationOutcome !== 'authorization_granted' || releaseOutcome !== 'release_go_decision') {
    progressionDecision = 'require_operator_checkpoint_before_lane_promotion';
  } else if ((input.evidence?.evidence_summary?.held_lane_total || 0) > 0) {
    progressionDecision = 'await_evidence_completion_before_progress';
  }

  return {
    decision_kind: 'bounded_coordinator_progression_decision_summary',
    progression_decision: progressionDecision,
    progression_mode: progressionMode,
    adjudication_outcome: adjudicationOutcome,
    review_handoff_ready_lane_total: reviewSummary.ready_lane_total || 0,
    ready_category_total: catalog.filter((item) => item.status === 'ready').length,
    hold_category_total: catalog.filter((item) => item.status !== 'ready').length,
    lane_order: LANE_ORDER,
    active_lane: activeLane,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildProgressionGuardrails(input = {}, decisionSummary = {}) {
  return {
    read_only_default: true,
    progression_scope_only: true,
    no_hidden_repo_mutations: true,
    no_uncontrolled_execution: true,
    runtime_source_of_truth: 'supabase',
    snapshot_safe_state_api: true,
    websocket_not_source_of_truth: true,
    terminal_consumer_composition: true,
    stop_on_guardrail_violation: true,
    require_explicit_operator_checkpoint: true,
    lane_order_consistency_required: true,
    execution_session_id: input.session?.execution_session?.session_id || null,
    progression_mode: decisionSummary.progression_mode || 'guarded_hold',
  };
}

function buildProgressionPayload(input = {}, catalog = [], decisionSummary = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    progression_decision: decisionSummary.progression_decision || 'hold_until_review_handoff_complete',
    progression_mode: decisionSummary.progression_mode || 'guarded_hold',
    lane_order: LANE_ORDER,
    progression_categories: catalog.map((item) => ({
      category: item.category,
      status: item.status,
    })),
    bounded_hook_results: input.hookResults,
    bridge_summary: input.bridgeSummary,
    review_handoff_summary: input.reviewHandoff?.review_handoff_summary || null,
    adjudication_outcome: input.adjudication?.adjudication_outcome || null,
    evidence_summary: input.evidence?.evidence_summary || null,
    intervention_summary: input.interventionSummary,
    future_engine_mode: 'staged_noop_or_guarded_progression_only',
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildBoundedCoordinatorProgressionLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const input = buildProgressionInputs(runtimeState, actorRole);
  const progressionCatalog = buildProgressionCatalog(input);
  const progressionDecisionSummary = buildProgressionDecisionSummary(input, progressionCatalog);
  const progressionGuardrails = buildProgressionGuardrails(input, progressionDecisionSummary);
  const progressionPayload = buildProgressionPayload(input, progressionCatalog, progressionDecisionSummary);

  return {
    updatedAt: input.updatedAt,
    actor_role: actorRole,
    progression_surface_kind: 'bounded-coordinator-progression',
    bounded_coordinator_progression: {
      progression_surface_kind: 'controlled_bounded_coordinator_progression',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      bridge_summary: input.bridgeSummary,
      review_handoff_summary: input.reviewHandoff?.review_handoff_summary || null,
      adjudication_summary: input.adjudication?.adjudication_summary || null,
      evidence_summary: input.evidence?.evidence_summary || null,
      intervention_summary: input.interventionSummary,
      decision_assistance: input.decisionAssistance?.planning_output || null,
      knowledge_routing: input.knowledge?.routing_summary || null,
    },
    progression_inputs: {
      review_handoff_inputs: input.reviewHandoff?.review_handoff_inputs || null,
      bridge_summary: input.bridgeSummary,
      adjudication_outcome: input.adjudication?.adjudication_outcome || null,
      evidence_summary: input.evidence?.evidence_summary || null,
      intervention_summary: input.interventionSummary,
      bounded_hook_results: input.hookResults,
      authorization_outcome: input.authorization?.execution_authorization_outcome || null,
      release_decision: input.releaseDecision?.release_decision_outcome || null,
      lane_order: LANE_ORDER,
      explainable: true,
      governed: true,
      read_only: true,
    },
    progression_guardrails: progressionGuardrails,
    progression_decision_summary: progressionDecisionSummary,
    progression_catalog: progressionCatalog,
    progression_payload: progressionPayload,
  };
}

module.exports = {
  buildBoundedCoordinatorProgressionLayer,
  buildProgressionInputs,
  buildLightweightAdjudicationSummary,
  buildLightweightProgressionHookResults,
  buildProgressionCatalog,
  buildProgressionDecisionSummary,
  buildProgressionGuardrails,
  buildProgressionPayload,
};
