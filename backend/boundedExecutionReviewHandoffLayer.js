const { buildExecutionSessionModelLayer } = require('./executionSessionModelLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildLightweightHookSnapshot(lane, bridgeOutcome = 'adjudication_hold_for_additional_evidence') {
  if (lane === 'backend') {
    return {
      lane,
      hook_summary: {
        lane,
        hook_total: 5,
        non_executable_hook_total: 5,
        bridge_outcome: bridgeOutcome,
        explainable: true,
      },
      hook_catalog: {
        lane,
        hook_names: [
          'load_supabase_snapshot',
          'assert_backend_contract_boundaries',
          'plan_backend_changes_noop',
          'await_operator_release_signal',
          'emit_backend_execution_report',
        ],
      },
    };
  }
  if (lane === 'ios') {
    return {
      lane,
      hook_summary: {
        lane,
        hook_total: 5,
        non_executable_hook_total: 5,
        bridge_outcome: bridgeOutcome,
        explainable: true,
      },
      hook_catalog: {
        lane,
        hook_names: [
          'load_supabase_snapshot',
          'assert_ios_contract_boundaries',
          'plan_ios_changes_noop',
          'await_operator_release_signal',
          'emit_ios_execution_report',
        ],
      },
    };
  }
  return {
    lane,
    hook_summary: {
      lane,
      hook_total: 5,
      non_executable_hook_total: 5,
      bridge_outcome: bridgeOutcome,
      explainable: true,
      verification_first: true,
    },
    hook_catalog: {
      lane,
      hook_names: [
        'load_supabase_snapshot',
        'assert_qa_contract_boundaries',
        'plan_qa_verification_noop',
        'await_operator_release_signal',
        'emit_qa_execution_report',
      ],
    },
  };
}

function buildReviewHandoffInputs(hookSnapshots = {}, bridgeSummary = {}, adjudication = {}, evidence = {}, interventionSummary = {}) {
  return {
    backend_hook_summary: hookSnapshots.backend?.hook_summary || null,
    ios_hook_summary: hookSnapshots.ios?.hook_summary || null,
    qa_hook_summary: hookSnapshots.qa?.hook_summary || null,
    bridge_summary: bridgeSummary,
    adjudication_summary: adjudication.adjudication_summary || null,
    evidence_summary: evidence.evidence_summary || null,
    intervention_summary: interventionSummary,
    adjudication_outcome: adjudication.adjudication_outcome?.overall_outcome || bridgeSummary.adjudication_outcome || 'adjudication_hold_for_additional_evidence',
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildReviewHandoffCatalog(hookSnapshots = {}) {
  return ['backend', 'ios', 'qa'].map((lane) => ({
    lane,
    hook_names: hookSnapshots[lane]?.hook_catalog?.hook_names || [],
    ready: Boolean(hookSnapshots[lane]?.hook_summary),
  }));
}

function buildLightweightBridgeSummary(runtimeState = {}, session = {}) {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const approvalPendingTotal = tasks.filter((task) => String(task?.approval_state || '').toLowerCase() === 'approval_pending').length;
  return {
    stage_total: 5,
    ready_stage_total: approvalPendingTotal > 0 ? 2 : 3,
    hold_stage_total: approvalPendingTotal > 0 ? 3 : 2,
    adjudication_outcome: approvalPendingTotal > 0 ? 'adjudication_hold_for_additional_evidence' : 'adjudication_ready_for_controlled_bridge',
    bridge_surface_kind: 'controlled_bounded_coordinator_execution_bridge_snapshot',
    execution_session_id: session.execution_session?.session_id || null,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildLightweightInterventionSummary(runtimeState = {}, session = {}, bridgeSummary = {}, evidence = {}) {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const checkpointCandidateTotal = tasks.filter((task) => String(task?.approval_state || '').toLowerCase() === 'approval_pending').length;
  return {
    lane_total: 3,
    intervention_action_total: checkpointCandidateTotal > 0 ? checkpointCandidateTotal + 3 : 3,
    available_intervention_total: checkpointCandidateTotal > 0 ? checkpointCandidateTotal : 1,
    loop_mode: bridgeSummary.adjudication_outcome || evidence.evidence_summary?.loop_mode || 'governed_hold',
    intervention_surface_kind: 'controlled_operator_intervention_control_snapshot',
    execution_session_id: session.execution_session?.session_id || null,
    explainable: true,
    governed: true,
    read_only: true,
  };
}

function buildReviewHandoffGuardrails(session = {}, interventionSummary = {}) {
  return {
    read_only_default: true,
    review_handoff_only: true,
    no_hidden_repo_mutations: true,
    no_uncontrolled_execution: true,
    runtime_source_of_truth: 'supabase',
    snapshot_safe_state_api: true,
    websocket_not_source_of_truth: true,
    execution_session_id: session.execution_session?.session_id || null,
    intervention_surface_kind: interventionSummary.intervention_surface_kind || 'controlled_operator_intervention_control_snapshot',
  };
}

function buildReviewHandoffSummary(catalog = [], inputs = {}) {
  return {
    lane_total: catalog.length,
    ready_lane_total: catalog.filter((item) => item.ready).length,
    adjudication_outcome: inputs.adjudication_outcome || 'adjudication_hold_for_additional_evidence',
    explainable: true,
  };
}

function buildReviewHandoffPayload(input = {}) {
  return {
    actor_role: input.actorRole,
    execution_session_id: input.session?.execution_session?.session_id || null,
    runtime_source: 'supabase',
    decision_owner: input.decisionAssistance?.planning_output?.suggested_owner || input.knowledge?.routing_summary?.suggested_owner || 'orchestrator',
    lane_catalog: input.catalog,
    adjudication_outcome: input.inputs?.adjudication_outcome || 'adjudication_hold_for_additional_evidence',
    read_only: true,
    governed: true,
    explainable: true,
  };
}

function buildLightweightReviewHandoffAdjudication(baseRuntime = {}, bridgeSummary = {}) {
  const tasks = Array.isArray(baseRuntime.tasks) ? baseRuntime.tasks : [];
  const heldLaneTotal = tasks.filter((task) => String(task?.approval_state || '').toLowerCase() === 'approval_pending').length > 0 ? 3 : 0;
  const overallOutcome = bridgeSummary.adjudication_outcome || (heldLaneTotal === 0 ? 'adjudication_ready_for_controlled_bridge' : 'adjudication_hold_for_additional_evidence');
  return {
    adjudication_outcome: {
      overall_outcome: overallOutcome,
      ready_lane_total: overallOutcome === 'adjudication_ready_for_controlled_bridge' ? 3 : 0,
      held_lane_total: heldLaneTotal,
      denied_lane_total: 0,
      explainable: true,
      governed: true,
      read_only: true,
    },
    adjudication_summary: {
      lane_total: 3,
      ready_lane_total: overallOutcome === 'adjudication_ready_for_controlled_bridge' ? 3 : 0,
      held_lane_total: heldLaneTotal,
      denied_lane_total: 0,
      overall_outcome: overallOutcome,
      explainable: true,
    },
  };
}

function buildLightweightReviewHandoffEvidence(baseRuntime = {}, bridgeSummary = {}) {
  const tasks = Array.isArray(baseRuntime.tasks) ? baseRuntime.tasks : [];
  const heldLaneTotal = tasks.filter((task) => String(task?.approval_state || '').toLowerCase() === 'approval_pending').length > 0 ? 3 : 0;
  return {
    evidence_summary: {
      lane_total: 3,
      evidence_reference_total: 15,
      authorized_lane_total: 0,
      held_lane_total: heldLaneTotal,
      loop_mode: bridgeSummary.adjudication_outcome === 'adjudication_ready_for_controlled_bridge' ? 'staged_guarded_progression' : 'guarded_hold',
      execution_session_id: null,
      release_decision: 'release_hold_decision',
      evidence_surface_kind: 'controlled_execution_evidence_ledger_snapshot',
      explainable: true,
      governed: true,
      read_only: true,
    },
  };
}

function buildBoundedExecutionReviewHandoffLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const baseRuntime = { updatedAt, tasks };

  const knowledge = buildKnowledgeAwareContext(baseRuntime, actorRole, { includeDecisionConsumer: false });
  const decisionAssistance = buildDecisionAssistanceSurface(baseRuntime, actorRole);
  const session = buildExecutionSessionModelLayer(baseRuntime, actorRole);
  const bridgeSummary = buildLightweightBridgeSummary(baseRuntime, session);
  const adjudication = buildLightweightReviewHandoffAdjudication(baseRuntime, bridgeSummary);
  const evidence = buildLightweightReviewHandoffEvidence(baseRuntime, bridgeSummary);
  const bridgeOutcome = bridgeSummary.adjudication_outcome || 'adjudication_hold_for_additional_evidence';
  const hookSnapshots = {
    backend: buildLightweightHookSnapshot('backend', bridgeOutcome),
    ios: buildLightweightHookSnapshot('ios', bridgeOutcome),
    qa: buildLightweightHookSnapshot('qa', bridgeOutcome),
  };
  const interventionSummary = buildLightweightInterventionSummary(baseRuntime, session, bridgeSummary, evidence);

  const reviewHandoffInputs = buildReviewHandoffInputs(hookSnapshots, bridgeSummary, adjudication, evidence, interventionSummary);
  const reviewHandoffCatalog = buildReviewHandoffCatalog(hookSnapshots);
  const reviewHandoffGuardrails = buildReviewHandoffGuardrails(session, interventionSummary);
  const reviewHandoffSummary = buildReviewHandoffSummary(reviewHandoffCatalog, reviewHandoffInputs);
  const reviewHandoffPayload = buildReviewHandoffPayload({ actorRole, session, decisionAssistance, knowledge, catalog: reviewHandoffCatalog, inputs: reviewHandoffInputs });

  return {
    updatedAt,
    actor_role: actorRole,
    handoff_surface_kind: 'bounded-execution-review-handoff',
    bounded_execution_review_handoff: {
      handoff_surface_kind: 'controlled_bounded_execution_review_handoff',
      runtime_source: 'supabase',
      governed: true,
      read_only_default: true,
      backend_hook_summary: hookSnapshots.backend.hook_summary,
      ios_hook_summary: hookSnapshots.ios.hook_summary,
      qa_hook_summary: hookSnapshots.qa.hook_summary,
      bridge_summary: bridgeSummary,
      adjudication_summary: adjudication.adjudication_summary,
      evidence_summary: evidence.evidence_summary,
      intervention_summary: interventionSummary,
      decision_assistance: decisionAssistance.planning_output,
      knowledge_routing: knowledge.routing_summary,
    },
    review_handoff_inputs: reviewHandoffInputs,
    review_handoff_catalog: reviewHandoffCatalog,
    review_handoff_guardrails: reviewHandoffGuardrails,
    review_handoff_summary: reviewHandoffSummary,
    review_handoff_payload: reviewHandoffPayload,
  };
}

module.exports = {
  buildBoundedExecutionReviewHandoffLayer,
  buildReviewHandoffInputs,
  buildReviewHandoffCatalog,
  buildLightweightBridgeSummary,
  buildLightweightInterventionSummary,
  buildReviewHandoffGuardrails,
  buildReviewHandoffSummary,
  buildReviewHandoffPayload,
};
