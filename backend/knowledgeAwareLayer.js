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

function buildKnowledgeAwareContext(runtimeState = {}, actorRole = 'orchestrator') {
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
  };
}

module.exports = {
  buildKnowledgeAwareContext,
  buildPlanningHints,
  buildMemoryAwareTaskContext,
  summarizeRouting,
};
