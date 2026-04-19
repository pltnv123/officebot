const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');
const { buildOperatorSurface } = require('./operatorLayer');
const { normalizeMaintenanceRoutine, computeStuckAge } = require('./operatorMaintenance');

function detectTaskType(task = {}) {
  const title = String(task.title || '').toLowerCase();
  if (title.includes('ios')) return 'ios';
  if (title.includes('qa') || title.includes('test')) return 'qa';
  if (title.includes('backend') || title.includes('api') || title.includes('server')) return 'backend';
  if (String(task.approval_state || '').toLowerCase() === 'approval_pending') return 'review';
  return 'general';
}

function pickSuggestedTarget(task = {}, decision = {}, knowledge = {}) {
  const assignmentState = String(task.assignment_state || '').toLowerCase();
  const approvalState = String(task.approval_state || '').toLowerCase();
  const taskType = detectTaskType(task);

  if (assignmentState === 'escalated' || approvalState === 'approval_pending') return 'CTO';
  if (taskType === 'ios') return 'iOS';
  if (taskType === 'qa') return 'QA';
  if (taskType === 'backend') return 'Backend';
  return String(decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator').toUpperCase();
}

function buildDispatchLanes(tasks = []) {
  const lanes = {
    by_role: { CTO: 0, Backend: 0, QA: 0, iOS: 0, ORCHESTRATOR: 0 },
    by_task_type: {},
    by_urgency: { high: 0, medium: 0, low: 0 },
  };

  for (const task of tasks) {
    const type = detectTaskType(task);
    const stuck = computeStuckAge(task);
    const approvalPending = String(task.approval_state || '').toLowerCase() === 'approval_pending';
    const escalated = String(task.assignment_state || '').toLowerCase() === 'escalated';
    const urgency = escalated || approvalPending || stuck.level === 'high'
      ? 'high'
      : (String(task.assignment_state || '').toLowerCase() === 'retry' || stuck.level === 'medium' ? 'medium' : 'low');
    const target = pickSuggestedTarget(task, {}, {});

    lanes.by_role[target] = (lanes.by_role[target] || 0) + 1;
    lanes.by_task_type[type] = (lanes.by_task_type[type] || 0) + 1;
    lanes.by_urgency[urgency] = (lanes.by_urgency[urgency] || 0) + 1;
  }

  return lanes;
}

function buildDispatchRecommendations(tasks = [], decision = {}, knowledge = {}, operator = {}) {
  return tasks.slice(0, 8).map((task) => {
    const maintenance = normalizeMaintenanceRoutine(task);
    const target = pickSuggestedTarget(task, decision, knowledge);
    const taskType = detectTaskType(task);
    const approvalPending = String(task.approval_state || '').toLowerCase() === 'approval_pending';
    const escalated = String(task.assignment_state || '').toLowerCase() === 'escalated';
    const urgency = escalated || approvalPending ? 'high' : (String(task.assignment_state || '').toLowerCase() === 'retry' ? 'medium' : 'low');

    return {
      task_id: task.id || null,
      title: task.title || '',
      suggested_target: target,
      task_type: taskType,
      urgency,
      reason: escalated
        ? 'escalated_task_requires_high_level_review'
        : approvalPending
          ? 'approval_pending_task_requires_decision'
          : maintenance[0]?.type || 'normal_dispatch_readiness',
      safe: true,
      top_actions: operator.cards?.find((card) => card.id === task.id)?.top_recommendations?.map((item) => item.action).filter(Boolean).slice(0, 3) || [],
    };
  });
}

function buildAssignmentCandidates(tasks = [], decision = {}, knowledge = {}) {
  return tasks.slice(0, 8).map((task) => ({
    task_id: task.id || null,
    candidates: [pickSuggestedTarget(task, decision, knowledge), 'Backend', 'QA', 'iOS', 'CTO']
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, 3),
  }));
}

function buildPriorityQueue(tasks = [], decision = {}, knowledge = {}) {
  return buildDispatchRecommendations(tasks, decision, knowledge, { cards: [] })
    .sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 };
      return (order[b.urgency] || 0) - (order[a.urgency] || 0);
    })
    .map((item, index) => ({
      rank: index + 1,
      task_id: item.task_id,
      suggested_target: item.suggested_target,
      urgency: item.urgency,
      reason: item.reason,
    }));
}

function buildTaskAgentMappingSuggestions(tasks = [], decision = {}, knowledge = {}) {
  return tasks.slice(0, 8).map((task) => ({
    task_id: task.id || null,
    suggested_agent: pickSuggestedTarget(task, decision, knowledge),
    task_type: detectTaskType(task),
    source_of_truth: 'supabase',
  }));
}

function buildAssistedExecutionDispatchLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const decision = buildDecisionAssistanceSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const operator = buildOperatorSurface({ updatedAt, actorRole, tasks });

  return {
    updatedAt,
    actor_role: actorRole,
    dispatch_kind: 'assisted-execution-dispatch-layer',
    dispatch_recommendations: buildDispatchRecommendations(tasks, decision, knowledge, operator),
    recipient_assignment_candidates: buildAssignmentCandidates(tasks, decision, knowledge),
    execution_priority_queue: buildPriorityQueue(tasks, decision, knowledge),
    task_to_agent_mapping_suggestions: buildTaskAgentMappingSuggestions(tasks, decision, knowledge),
    dispatch_lanes: buildDispatchLanes(tasks),
    dispatch_payload: {
      actor_role: actorRole,
      suggested_owner: decision.planning_output?.suggested_owner || knowledge.routing_summary?.suggested_owner || 'orchestrator',
      maintenance_pending: operator.analytics?.maintenance_digest?.pending_total || 0,
      escalated: operator.analytics?.escalated || 0,
      approval_pending: operator.analytics?.approval_pending || 0,
      read_only: true,
    },
  };
}

module.exports = {
  buildAssistedExecutionDispatchLayer,
  detectTaskType,
  buildDispatchLanes,
  buildDispatchRecommendations,
  buildAssignmentCandidates,
  buildPriorityQueue,
  buildTaskAgentMappingSuggestions,
};
