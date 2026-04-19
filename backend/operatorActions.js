const { ORCHESTRATOR_CONTROL } = require('./taskOrchestrator');
const { ensureTaskLock, requestApproval, resolveApproval } = require('./approvalLockEngine');
const { ensureReviewRetryEscalationState, applyRetryPolicy } = require('./reviewRetryEngine');
const { applyRuntimeEventGuards } = require('./runtimeGuards');

function nowIso() {
  return new Date().toISOString();
}

function makeResult(action, status, detail = {}) {
  return {
    action,
    status,
    owner: ORCHESTRATOR_CONTROL.owner,
    ts: nowIso(),
    detail,
  };
}

function appendAuditEvent(task = {}, type, payload = {}) {
  return applyRuntimeEventGuards([
    ...(Array.isArray(task.events) ? task.events : []),
    {
      type,
      owner: ORCHESTRATOR_CONTROL.owner,
      created_at: nowIso(),
      payload: {
        owner: ORCHESTRATOR_CONTROL.owner,
        ...payload,
      },
    },
  ]);
}

const ACTION_CAPABILITY_RULES = {
  approve_task: { visible: ['orchestrator', 'cto'], executable: ['orchestrator'] },
  reject_task: { visible: ['orchestrator', 'cto'], executable: ['orchestrator'] },
  requeue_task: { visible: ['orchestrator', 'cto', 'qa'], executable: ['orchestrator'] },
  escalate_task: { visible: ['orchestrator', 'cto'], executable: ['orchestrator'] },
  resolve_lock_conflict: { visible: ['orchestrator', 'cto'], executable: ['orchestrator'] },
  acknowledge_escalation: { visible: ['orchestrator', 'cto'], executable: ['orchestrator'] },
  request_approval: { visible: ['orchestrator', 'cto'], executable: ['orchestrator'] },
};

function applyCapabilityRouting(actions = [], actorRole = 'orchestrator') {
  const role = String(actorRole || 'orchestrator').toLowerCase();
  return actions
    .filter((entry) => {
      const policy = ACTION_CAPABILITY_RULES[String(entry.action || '')] || null;
      return !policy || policy.visible.includes(role);
    })
    .map((entry) => {
      const policy = ACTION_CAPABILITY_RULES[String(entry.action || '')] || null;
      const executable = !policy || policy.executable.includes(role);
      return {
        ...entry,
        visible_to: policy?.visible || ['orchestrator'],
        executable_by: policy?.executable || ['orchestrator'],
        executable,
      };
    });
}

function buildOperatorActions(task = {}, actorRole = 'orchestrator') {
  const actions = [];
  const assignmentState = String(task.assignment_state || '').toLowerCase();
  const approvalState = String(task.approval_state || '').toLowerCase();

  if (task.lock_conflict) {
    actions.push({ action: 'resolve_lock_conflict', owner: ORCHESTRATOR_CONTROL.owner, safe: true });
  }
  if (approvalState === 'approval_pending') {
    actions.push({ action: 'approve_task', owner: ORCHESTRATOR_CONTROL.owner, safe: true });
    actions.push({ action: 'reject_task', owner: ORCHESTRATOR_CONTROL.owner, safe: true });
  }
  if (assignmentState === 'retry') {
    actions.push({ action: 'requeue_task', owner: ORCHESTRATOR_CONTROL.owner, safe: true });
    actions.push({ action: 'escalate_task', owner: ORCHESTRATOR_CONTROL.owner, safe: true });
  }
  if (assignmentState === 'escalated') {
    actions.push({ action: 'acknowledge_escalation', owner: ORCHESTRATOR_CONTROL.owner, safe: true });
  }
  if (approvalState === '' || approvalState === 'none') {
    actions.push({ action: 'request_approval', owner: ORCHESTRATOR_CONTROL.owner, safe: true });
  }

  return applyCapabilityRouting(actions, actorRole);
}

function executeOperatorAction(task = {}, action, actorRole = 'orchestrator') {
  let nextTask = ensureReviewRetryEscalationState(ensureTaskLock(task, ORCHESTRATOR_CONTROL.owner));
  const actionName = String(action || '').toLowerCase();
  const policy = ACTION_CAPABILITY_RULES[actionName] || { executable: ['orchestrator'] };
  if (!policy.executable.includes(String(actorRole || 'orchestrator').toLowerCase())) {
    return { task: nextTask, result: makeResult(actionName || 'unknown', 'forbidden', { reason: 'capability_denied', actor_role: actorRole }) };
  }

  switch (actionName) {
    case 'request_approval':
      nextTask = requestApproval(nextTask);
      nextTask.events = appendAuditEvent(nextTask, 'operator_action', { action: actionName, outcome: 'approval_requested' });
      return { task: nextTask, result: makeResult(actionName, 'ok', { approval_state: nextTask.approval_state }) };
    case 'approve_task':
      nextTask = resolveApproval(nextTask, 'approved');
      nextTask.events = appendAuditEvent(nextTask, 'operator_action', { action: actionName, outcome: 'approved' });
      return { task: nextTask, result: makeResult(actionName, 'ok', { approval_state: nextTask.approval_state }) };
    case 'reject_task':
      nextTask = resolveApproval(nextTask, 'rejected');
      nextTask.events = appendAuditEvent(nextTask, 'operator_action', { action: actionName, outcome: 'rejected' });
      return { task: nextTask, result: makeResult(actionName, 'ok', { approval_state: nextTask.approval_state }) };
    case 'resolve_lock_conflict':
      nextTask.lock_conflict = false;
      nextTask.lock_owner = ORCHESTRATOR_CONTROL.owner;
      nextTask.events = appendAuditEvent(nextTask, 'operator_action', { action: actionName, outcome: 'lock_reassigned' });
      return { task: nextTask, result: makeResult(actionName, 'ok', { lock_owner: nextTask.lock_owner }) };
    case 'requeue_task':
      nextTask.status = 'pending';
      if (String(nextTask.assignment_state || '').toLowerCase() === 'retry') {
        nextTask.assignment_state = 'queued';
      }
      nextTask.events = appendAuditEvent(nextTask, 'operator_action', { action: actionName, outcome: 'requeued' });
      return { task: nextTask, result: makeResult(actionName, 'ok', { assignment_state: nextTask.assignment_state }) };
    case 'escalate_task':
      nextTask.attempts = Number(nextTask.max_attempts || nextTask.maxAttempts || nextTask.attempts || 0);
      nextTask = applyRetryPolicy(nextTask);
      nextTask.assignment_state = 'escalated';
      nextTask.events = appendAuditEvent(nextTask, 'operator_action', { action: actionName, outcome: 'escalated' });
      return { task: nextTask, result: makeResult(actionName, 'ok', { assignment_state: nextTask.assignment_state }) };
    case 'acknowledge_escalation':
      nextTask.events = appendAuditEvent(nextTask, 'operator_action', { action: actionName, outcome: 'acknowledged' });
      return { task: nextTask, result: makeResult(actionName, 'ok', { acknowledged: true }) };
    default:
      return { task: nextTask, result: makeResult(actionName || 'unknown', 'ignored', { reason: 'unsupported_action' }) };
  }
}

module.exports = {
  ACTION_CAPABILITY_RULES,
  applyCapabilityRouting,
  buildOperatorActions,
  executeOperatorAction,
};
