const { buildAssistedExecutionDispatchLayer } = require('./assistedExecutionDispatchLayer');
const { buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');
const { buildOperatorSurface } = require('./operatorLayer');
const { normalizeMaintenanceRoutine, computeStuckAge } = require('./operatorMaintenance');

function buildAssignmentReadinessChecks(tasks = [], dispatch = {}) {
  return tasks.slice(0, 8).map((task) => {
    const stuck = computeStuckAge(task);
    const approvalPending = String(task.approval_state || '').toLowerCase() === 'approval_pending';
    const escalated = String(task.assignment_state || '').toLowerCase() === 'escalated';
    const lockConflict = Boolean(task.lock_conflict);
    const ready = !lockConflict && !escalated;
    return {
      task_id: task.id || null,
      suggested_target: dispatch.dispatch_recommendations?.find((item) => item.task_id === task.id)?.suggested_target || 'ORCHESTRATOR',
      ready,
      blockers: [
        approvalPending ? 'approval_pending' : '',
        escalated ? 'escalated_task' : '',
        lockConflict ? 'lock_conflict' : '',
        stuck.level === 'high' ? 'stale_high' : '',
      ].filter(Boolean),
    };
  });
}

function buildLaneSaturationSignals(dispatch = {}) {
  const lanes = dispatch.dispatch_lanes || {};
  const role = lanes.by_role || {};
  return Object.entries(role).map(([lane, total]) => ({
    lane,
    total,
    saturated: Number(total || 0) >= 2,
  }));
}

function buildHandoffBlockers(tasks = []) {
  return tasks.slice(0, 8).flatMap((task) => {
    const maintenance = normalizeMaintenanceRoutine(task);
    return maintenance
      .filter((item) => item.level === 'high' || item.type === 'stuck_conflict_followup')
      .map((item) => ({
        task_id: task.id || null,
        blocker_type: item.type,
        action: item.action,
        level: item.level,
      }));
  }).slice(0, 8);
}

function buildGoNoGoSummary(tasks = [], dispatch = {}, operator = {}, knowledge = {}) {
  const blockers = buildHandoffBlockers(tasks);
  const laneSignals = buildLaneSaturationSignals(dispatch);
  const hardBlockers = blockers.length + (operator.analytics?.escalated || 0) + (operator.analytics?.lock_conflicts || 0);
  return {
    status: hardBlockers > 0 ? 'no_go' : 'go',
    reason: hardBlockers > 0 ? 'dispatch_blockers_present' : 'dispatch_ready',
    blocker_total: blockers.length,
    saturated_lanes: laneSignals.filter((item) => item.saturated).map((item) => item.lane),
    suggested_owner: knowledge.routing_summary?.suggested_owner || dispatch.dispatch_payload?.suggested_owner || 'orchestrator',
  };
}

function buildAssistedExecutionDispatchReadinessLayer(runtimeState = {}, actorRole = 'orchestrator') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const dispatch = buildAssistedExecutionDispatchLayer({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole, { includeDecisionConsumer: false });
  const operator = buildOperatorSurface({ updatedAt, actorRole, tasks });

  return {
    updatedAt,
    actor_role: actorRole,
    readiness_kind: 'assisted-execution-dispatch-readiness',
    assignment_readiness_checks: buildAssignmentReadinessChecks(tasks, dispatch),
    lane_saturation_signals: buildLaneSaturationSignals(dispatch),
    handoff_blockers: buildHandoffBlockers(tasks),
    dispatch_go_no_go_summary: buildGoNoGoSummary(tasks, dispatch, operator, knowledge),
    readiness_payload: {
      actor_role: actorRole,
      read_only: true,
      maintenance_pending: operator.analytics?.maintenance_digest?.pending_total || 0,
      approval_pending: operator.analytics?.approval_pending || 0,
      escalated: operator.analytics?.escalated || 0,
    },
  };
}

module.exports = {
  buildAssistedExecutionDispatchReadinessLayer,
  buildAssignmentReadinessChecks,
  buildLaneSaturationSignals,
  buildHandoffBlockers,
  buildGoNoGoSummary,
};
