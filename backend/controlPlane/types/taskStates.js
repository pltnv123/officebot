// V1 control-plane vocabulary only.
// No transition logic belongs here.
// Lifecycle ownership is intentionally centralized elsewhere.
// Repositories must not infer authority from these constants alone.
// Note: task state `expired` is intentionally excluded from v1.
// Expiry is modeled through approval/spawn request states and lease/audit events, not as a task terminal state.

const TASK_STATES = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  CLAIMED: 'claimed',
  RUNNING: 'running',
  WAITING_FOR_APPROVAL: 'waiting_for_approval',
  WAITING_FOR_CHILD: 'waiting_for_child',
  PAUSED: 'paused',
  RETRY_SCHEDULED: 'retry_scheduled',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

const TERMINAL_TASK_STATES = Object.freeze([
  TASK_STATES.COMPLETED,
  TASK_STATES.FAILED,
  TASK_STATES.CANCELLED,
]);

const NON_TERMINAL_TASK_STATES = Object.freeze([
  TASK_STATES.CREATED,
  TASK_STATES.READY,
  TASK_STATES.CLAIMED,
  TASK_STATES.RUNNING,
  TASK_STATES.WAITING_FOR_APPROVAL,
  TASK_STATES.WAITING_FOR_CHILD,
  TASK_STATES.PAUSED,
  TASK_STATES.RETRY_SCHEDULED,
]);

module.exports = {
  TASK_STATES,
  TERMINAL_TASK_STATES,
  NON_TERMINAL_TASK_STATES,
};
