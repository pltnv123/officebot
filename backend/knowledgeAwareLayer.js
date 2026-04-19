const { buildOperatorSurface } = require('./operatorLayer');
const { buildRuntimeUiView } = require('./uiStateView');

function summarizeRouting(tasks = []) {
  const list = Array.isArray(tasks) ? tasks : [];
  const summary = {
    total_tasks: list.length,
    pending_review: 0,
    retry_queue: 0,
    escalated: 0,
    approval_pending: 0,
    suggested_owner: 'orchestrator',
  };

  for (const task of list) {
    const assignmentState = String(task?.assignment_state || '').toLowerCase();
    const approvalState = String(task?.approval_state || '').toLowerCase();
    const status = String(task?.status || '').toLowerCase();
    if (approvalState === 'approval_pending') summary.approval_pending += 1;
    if (assignmentState === 'retry') summary.retry_queue += 1;
    if (assignmentState === 'escalated') summary.escalated += 1;
    if (status === 'review' || approvalState === 'approval_pending' || assignmentState === 'escalated') summary.pending_review += 1;
  }

  if (summary.escalated > 0 || summary.approval_pending > 0) {
    summary.suggested_owner = 'cto';
  }

  return summary;
}

function buildPlanningHints(tasks = [], actorRole = 'orchestrator') {
  const routing = summarizeRouting(tasks);
  const hints = [
    {
      kind: 'runtime_source_of_truth',
      system: 'supabase',
      priority: 'high',
      note: 'Use Supabase-backed runtime snapshot as source of truth for routing decisions.',
    },
    {
      kind: 'retrieval_context',
      system: 'qmd',
      priority: 'medium',
      note: 'Use QMD retrieval to enrich planning with prior architecture, ownership, and delivery context.',
    },
    {
      kind: 'memory_context',
      system: 'lossless-claw',
      priority: 'medium',
      note: 'Use lossless-claw memory to recover prior decisions, blockers, and session-local operator context.',
    },
  ];

  if (routing.approval_pending > 0) {
    hints.push({
      kind: 'approval_attention',
      system: actorRole === 'cto' ? 'cto' : 'orchestrator',
      priority: 'high',
      note: 'Approval-pending tasks require review-aware routing before execution continues.',
    });
  }

  if (routing.retry_queue > 0) {
    hints.push({
      kind: 'retry_retrieval',
      system: 'qmd',
      priority: 'medium',
      note: 'Retry tasks should carry retrieved execution history and known-failure context into planning.',
    });
  }

  if (routing.escalated > 0) {
    hints.push({
      kind: 'escalation_memory',
      system: 'lossless-claw',
      priority: 'high',
      note: 'Escalated tasks should surface prior operator decisions and unresolved blockers before reassignment.',
    });
  }

  return hints;
}

function buildMemoryAwareTaskContext(task = {}) {
  return {
    task_id: task.id || null,
    title: task.title || '',
    routing_tags: [
      String(task.status || 'unknown').toLowerCase(),
      String(task.assignment_state || 'unassigned').toLowerCase(),
      String(task.approval_state || 'none').toLowerCase(),
    ].filter(Boolean),
    memory_queries: [
      `task ${task.id || ''}`.trim(),
      task.title || '',
      String(task.assignment_state || '').toLowerCase() === 'escalated' ? 'manual review blocker' : '',
      String(task.approval_state || '').toLowerCase() === 'approval_pending' ? 'approval pending decision' : '',
    ].filter(Boolean),
    retrieval_queries: [
      task.title || '',
      `${task.id || ''} architecture`.trim(),
      `${task.id || ''} owner handoff`.trim(),
    ].filter(Boolean),
    source_of_truth: 'supabase',
    retrieval_layer: 'qmd',
    memory_layer: 'lossless-claw',
  };
}

function buildDecisionConsumerSurfaceFromKnowledge(knowledge = {}, actorRole = 'orchestrator') {
  const topTask = knowledge.memory_aware_tasks?.[0] || null;

  return {
    actor_role: actorRole,
    suggested_owner: knowledge.routing_summary.suggested_owner,
    decision_summary: {
      routing_focus: knowledge.routing_summary.pending_review > 0 ? 'review_attention' : 'normal_flow',
      approval_pending: knowledge.routing_summary.approval_pending,
      escalated: knowledge.routing_summary.escalated,
      retry_queue: knowledge.routing_summary.retry_queue,
    },
    retrieval_aware_planning_hints: knowledge.planning_hints,
    routing_context_summary: knowledge.context_summary,
    memory_aware_task_context: knowledge.memory_aware_tasks,
    cto_orchestrator_brief: {
      headline: knowledge.routing_summary.suggested_owner === 'cto'
        ? 'CTO review is recommended before further routing changes.'
        : 'Orchestrator can continue with normal routing decisions.',
      top_task_id: topTask?.task_id || null,
      top_memory_queries: topTask?.memory_queries || [],
      top_retrieval_queries: topTask?.retrieval_queries || [],
    },
    compact_decision_payload: {
      actor_role: actorRole,
      suggested_owner: knowledge.routing_summary.suggested_owner,
      routing_focus: knowledge.routing_summary.pending_review > 0 ? 'review_attention' : 'normal_flow',
      hint_kinds: knowledge.planning_hints.map((item) => item.kind),
      top_task_ids: knowledge.memory_aware_tasks.slice(0, 3).map((item) => item.task_id),
    },
  };
}

function buildDecisionConsumerSurface(runtimeState = {}, actorRole = 'orchestrator') {
  const knowledge = buildKnowledgeAwareContext(runtimeState, actorRole, { includeDecisionConsumer: false });
  return buildDecisionConsumerSurfaceFromKnowledge(knowledge, actorRole);
}

function buildKnowledgeAwareContext(runtimeState = {}, actorRole = 'orchestrator', options = {}) {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const ui = buildRuntimeUiView({ updatedAt: runtimeState.updatedAt, tasks });
  const operator = buildOperatorSurface({ updatedAt: runtimeState.updatedAt, actorRole, tasks });
  const routing = summarizeRouting(tasks);

  return {
    updatedAt: runtimeState.updatedAt || runtimeState.timestamp || null,
    actor_role: actorRole,
    source_of_truth: {
      runtime: 'supabase',
      retrieval: 'qmd',
      memory: 'lossless-claw',
    },
    routing_summary: routing,
    planning_hints: buildPlanningHints(tasks, actorRole),
    context_summary: {
      runtime_tasks: ui.tasks.length,
      operator_cards: operator.cards.length,
      approval_pending: operator.analytics?.approval_pending || 0,
      retries: operator.analytics?.retry_total || 0,
      escalations: operator.analytics?.escalated || 0,
      maintenance_pending: operator.analytics?.maintenance_digest?.pending_total || 0,
    },
    memory_aware_tasks: tasks.slice(0, 5).map((task) => buildMemoryAwareTaskContext(task)),
    compact_context_payload: {
      actor_role: actorRole,
      suggested_owner: routing.suggested_owner,
      planning_hints: buildPlanningHints(tasks, actorRole).map((item) => ({
        kind: item.kind,
        system: item.system,
        priority: item.priority,
      })),
      routing_counts: {
        total_tasks: routing.total_tasks,
        pending_review: routing.pending_review,
        retry_queue: routing.retry_queue,
        escalated: routing.escalated,
        approval_pending: routing.approval_pending,
      },
    },
    ...(options.includeDecisionConsumer === false ? {} : {
      decision_consumer: buildDecisionConsumerSurfaceFromKnowledge({
        updatedAt: runtimeState.updatedAt || runtimeState.timestamp || null,
        actor_role: actorRole,
        source_of_truth: {
          runtime: 'supabase',
          retrieval: 'qmd',
          memory: 'lossless-claw',
        },
        routing_summary: routing,
        planning_hints: buildPlanningHints(tasks, actorRole),
        context_summary: {
          runtime_tasks: ui.tasks.length,
          operator_cards: operator.cards.length,
          approval_pending: operator.analytics?.approval_pending || 0,
          retries: operator.analytics?.retry_total || 0,
          escalations: operator.analytics?.escalated || 0,
          maintenance_pending: operator.analytics?.maintenance_digest?.pending_total || 0,
        },
        memory_aware_tasks: tasks.slice(0, 5).map((task) => buildMemoryAwareTaskContext(task)),
      }, actorRole),
    }),
  };
}

module.exports = {
  buildKnowledgeAwareContext,
  buildDecisionConsumerSurface,
  buildPlanningHints,
  buildMemoryAwareTaskContext,
  summarizeRouting,
};
