const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');

function buildReleaseDecisionOutcome(review = {}, blockers = {}, perAgent = []) {
  const holdBlockers = Object.values(blockers).reduce((sum, value) => sum + Number(value || 0), 0);
  const readyAgents = perAgent.filter((item) => item.release_decision === 'release_ready').length;
  return {
    decision: holdBlockers === 0 && review.release_posture?.posture === 'operator_review_ready' && readyAgents === perAgent.length
      ? 'release_ready_decision'
      : 'release_hold_decision',
    reason: holdBlockers === 0 ? 'operator_review_ready' : 'release_blockers_present',
    explainable: true,
  };
}

function buildReleaseDecisionOptions(review = {}, perAgent = []) {
  return [
    {
      option: 'hold_release',
      posture: 'conservative',
      reason: review.release_posture?.posture || 'operator_review_hold',
      explainable: true,
    },
    {
      option: 'partial_release_readiness',
      posture: 'guarded',
      reason: `${perAgent.filter((item) => item.release_decision === 'release_ready').length}/${perAgent.length} agents ready`,
      explainable: true,
    },
    {
      option: 'release_ready_path',
      posture: 'progressive',
      reason: review.release_posture?.posture === 'operator_review_ready' ? 'operator_review_ready' : 'not_ready',
      explainable: true,
    },
  ];
}

function buildReleaseBlockersMatrix(review = {}, simulation = {}, reconciliation = {}) {
  return {
    gate_holds: (review.release_gates || []).filter((item) => item.status !== 'pass').length,
    checkpoint_holds: (review.operator_review_checkpoints || []).filter((item) => item.status !== 'ready').length,
    simulated_hold_agents: (simulation.launch_simulation_summary?.simulation_total || 0) - (simulation.launch_simulation_summary?.simulated_ready_agents || 0),
    reconciliation_holds: reconciliation.reconciliation_outcome?.blocked_lane_total || 0,
  };
}

function buildPerAgentReleaseDecision(review = [], inputPack = {}) {
  const simulationByAgent = inputPack.simulationByAgent || {};
  return review.map((item) => {
    const sim = simulationByAgent[item.agent] || {};
    const ready = item.simulated_launch_posture === 'simulated_ready' && (sim.blocker_count || 0) === 0;
    return {
      agent: item.agent,
      release_decision: ready ? 'release_ready' : 'release_hold',
      reason: ready ? 'simulated_ready_without_blockers' : 'simulated_hold_or_blockers_present',
      explainable: true,
    };
  });
}

function buildReleaseDecisionSummary(outcome = {}, options = [], blockers = {}, perAgent = []) {
  return {
    decision: outcome.decision || 'release_hold_decision',
    option_total: options.length,
    blocker_total: Object.values(blockers).reduce((sum, value) => sum + Number(value || 0), 0),
    ready_agents: perAgent.filter((item) => item.release_decision === 'release_ready').length,
    explainable: true,
  };
}

function buildReleaseDecisionSummaryInputPack(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const knowledge = buildKnowledgeAwareContext(runtimeState, actorRole, { includeDecisionConsumer: false });
  const perAgentReview = ['backend', 'ios', 'qa'].map((agent) => {
    const laneTasks = tasks.filter((task) => {
      const title = String(task.title || '').toLowerCase();
      if (agent === 'backend') return title.includes('backend') || title.includes('api') || title.includes('server');
      if (agent === 'ios') return title.includes('ios');
      return title.includes('qa') || title.includes('test');
    });
    const blockerCount = laneTasks.reduce((sum, task) => {
      const approvalPending = String(task.approval_state || '').toLowerCase() === 'approval_pending';
      const escalated = String(task.assignment_state || '').toLowerCase() === 'escalated';
      const lockConflict = Boolean(task.lock_conflict);
      return sum + (approvalPending ? 1 : 0) + (escalated ? 1 : 0) + (lockConflict ? 1 : 0);
    }, 0);
    const scopeCount = laneTasks.length;
    const simulatedLaunchPosture = blockerCount === 0 && scopeCount > 0 ? 'simulated_ready' : 'simulated_hold';
    return {
      agent,
      simulated_launch_posture: simulatedLaunchPosture,
      scope_count: scopeCount,
      blocker_count: blockerCount,
      envelope_kind: 'read_only_execution_envelope',
      explainable: true,
    };
  });

  const simulationByAgent = Object.fromEntries(perAgentReview.map((item) => [item.agent, {
    blocker_count: item.blocker_count,
    scope_count: item.scope_count,
    simulated_launch_posture: item.simulated_launch_posture,
  }]));

  const governanceOutcome = perAgentReview.every((item) => item.simulated_launch_posture === 'simulated_ready')
    ? 'dispatch_review_ready'
    : 'dispatch_hold_decision';
  const laneHandoffReady = perAgentReview.filter((item) => item.scope_count > 0 && item.blocker_count === 0).length;
  const reconciliationBlockedLaneTotal = perAgentReview.filter((item) => item.blocker_count > 0).length;
  const reconciliationOutcome = reconciliationBlockedLaneTotal === 0 ? 'lane_reconciliation_ready' : 'lane_reconciliation_hold';
  const contractTotal = perAgentReview.length;
  const envelopeTotal = perAgentReview.length;
  const simulatedReadyAgents = perAgentReview.filter((item) => item.simulated_launch_posture === 'simulated_ready').length;
  const operatorReleasePosture = simulatedReadyAgents === perAgentReview.length ? 'operator_review_ready' : 'operator_review_hold';
  const activationReviewDecision = governanceOutcome === 'dispatch_review_ready' ? 'review_ready' : 'review_hold';
  const advisoryRecommendation = governanceOutcome === 'dispatch_review_ready' ? 'start_ready' : 'hold';
  const preflightStatus = governanceOutcome === 'dispatch_review_ready' ? 'start_ready' : 'hold';
  const readinessStatus = reconciliationOutcome === 'lane_reconciliation_ready' ? 'go' : 'hold';
  const decisionOwner = knowledge.routing_summary?.suggested_owner || actorRole;

  const releaseGates = [
    {
      gate: 'governance_release_readiness',
      status: governanceOutcome === 'dispatch_review_ready' ? 'pass' : 'hold',
      detail: governanceOutcome === 'dispatch_review_ready' ? 'ready_for_handoff_surface' : 'not_ready_for_handoff_surface',
    },
    {
      gate: 'simulation_posture',
      status: simulatedReadyAgents > 0 ? 'pass' : 'hold',
      detail: `${simulatedReadyAgents} simulated ready agents`,
    },
    {
      gate: 'lane_reconciliation',
      status: reconciliationOutcome === 'lane_reconciliation_ready' ? 'pass' : 'hold',
      detail: reconciliationOutcome,
    },
  ];

  return {
    knowledge,
    review: {
      release_gates: releaseGates,
      operator_review_checkpoints: perAgentReview.map((item) => ({
        agent: item.agent,
        checkpoint: 'review_simulated_launch_posture',
        status: item.simulated_launch_posture === 'simulated_ready' ? 'ready' : 'hold',
        blockers: item.blocker_count > 0 ? ['lane_blockers_present'] : [],
      })),
      release_posture: {
        posture: operatorReleasePosture,
      },
      per_agent_release_review: perAgentReview,
      operator_release_review_payload: {
        activation_review_decision: activationReviewDecision,
        advisory_recommendation: advisoryRecommendation,
        preflight_status: preflightStatus,
        coordination_owner: decisionOwner,
        readiness_status: readinessStatus,
        decision_owner: decisionOwner,
      },
    },
    simulation: {
      launch_simulation_summary: {
        simulation_total: perAgentReview.length,
        simulated_ready_agents: simulatedReadyAgents,
      },
      simulationByAgent,
    },
    envelopes: {
      execution_envelope_summary: {
        envelope_total: envelopeTotal,
      },
    },
    contracts: {
      handoff_contract_summary: {
        contract_total: contractTotal,
      },
      handoff_contract_payload: {
        governance_outcome: governanceOutcome,
        activation_review_decision: activationReviewDecision,
        advisory_recommendation: advisoryRecommendation,
        preflight_status: preflightStatus,
        coordination_owner: decisionOwner,
        readiness_status: readinessStatus,
        decision_owner: decisionOwner,
      },
    },
    reconciliation: {
      reconciliation_outcome: {
        outcome: reconciliationOutcome,
        blocked_lane_total: reconciliationBlockedLaneTotal,
      },
    },
    laneHandoff: {
      lane_handoff_summary: {
        ready_lanes: laneHandoffReady,
      },
      lane_handoff_payload: {
        governance_outcome: governanceOutcome,
        activation_review_decision: activationReviewDecision,
        advisory_recommendation: advisoryRecommendation,
        preflight_status: preflightStatus,
        decision_owner: decisionOwner,
      },
    },
  };
}

function buildAssistedExecutionReleaseDecisionLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const inputPack = buildReleaseDecisionSummaryInputPack({ updatedAt, tasks }, actorRole);
  const { knowledge, review, simulation, envelopes, contracts, reconciliation, laneHandoff } = inputPack;

  const governanceOutcome = contracts.handoff_contract_payload?.governance_outcome || laneHandoff.lane_handoff_payload?.governance_outcome || 'dispatch_hold_decision';
  const activationReviewDecision = review.operator_release_review_payload?.activation_review_decision || contracts.handoff_contract_payload?.activation_review_decision || laneHandoff.lane_handoff_payload?.activation_review_decision || 'review_hold';
  const advisoryRecommendation = review.operator_release_review_payload?.advisory_recommendation || contracts.handoff_contract_payload?.advisory_recommendation || laneHandoff.lane_handoff_payload?.advisory_recommendation || 'hold';
  const preflightStatus = review.operator_release_review_payload?.preflight_status || contracts.handoff_contract_payload?.preflight_status || laneHandoff.lane_handoff_payload?.preflight_status || 'hold';
  const coordinationOwner = review.operator_release_review_payload?.coordination_owner || contracts.handoff_contract_payload?.coordination_owner || laneHandoff.lane_handoff_payload?.decision_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator';
  const readinessStatus = review.operator_release_review_payload?.readiness_status || contracts.handoff_contract_payload?.readiness_status || 'hold';
  const decisionOwner = review.operator_release_review_payload?.decision_owner || contracts.handoff_contract_payload?.decision_owner || laneHandoff.lane_handoff_payload?.decision_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator';

  const perAgentDecision = buildPerAgentReleaseDecision(review.per_agent_release_review || [], simulation);
  const blockers = buildReleaseBlockersMatrix(review, simulation, reconciliation);
  const outcome = buildReleaseDecisionOutcome(review, blockers, perAgentDecision);
  const options = buildReleaseDecisionOptions(review, perAgentDecision);
  const summary = buildReleaseDecisionSummary(outcome, options, blockers, perAgentDecision);

  return {
    updatedAt,
    actor_role: actorRole,
    decision_surface_kind: 'assisted-execution-release-decision',
    release_decision_outcome: outcome,
    release_decision_options: options,
    release_blockers_matrix: blockers,
    per_agent_release_decision: perAgentDecision,
    release_decision_summary: summary,
    release_decision_payload: {
      actor_role: actorRole,
      governance_outcome: governanceOutcome,
      dispatch_outcome: governanceOutcome,
      activation_review_decision: activationReviewDecision,
      advisory_recommendation: advisoryRecommendation,
      preflight_status: preflightStatus,
      coordination_owner: coordinationOwner,
      readiness_status: readinessStatus,
      decision_owner: decisionOwner,
      contract_total: contracts.handoff_contract_summary?.contract_total || 0,
      envelope_total: envelopes.execution_envelope_summary?.envelope_total || 0,
      lane_handoff_ready: laneHandoff.lane_handoff_summary?.ready_lanes || 0,
      reconciliation_outcome: reconciliation.reconciliation_outcome?.outcome || 'lane_reconciliation_hold',
      simulation_ready_agents: simulation.launch_simulation_summary?.simulated_ready_agents || 0,
      operator_release_posture: review.release_posture?.posture || 'operator_review_hold',
      read_only: true,
      explainable: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionReleaseDecisionLayer,
  buildReleaseDecisionOutcome,
  buildReleaseDecisionOptions,
  buildReleaseBlockersMatrix,
  buildPerAgentReleaseDecision,
  buildReleaseDecisionSummary,
};
