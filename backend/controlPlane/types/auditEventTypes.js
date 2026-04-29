// V1 control-plane vocabulary only.
// No emission or transition logic belongs here.
// Lifecycle and audit ownership are intentionally centralized elsewhere.
// Repositories must not infer authority from these constants alone.
// Naming rule: event names use lowercase snake_case and follow entity-first grouping,
// for example task_*, spawn_*, approval_request_*, agent_*, child_result_*, subtree_*, lease_*.

const AUDIT_EVENT_TYPES = Object.freeze({
  TASK_CREATED: 'task_created',
  TASK_READY: 'task_ready',
  TASK_CLAIMED: 'task_claimed',
  TASK_STARTED: 'task_started',
  TASK_HEARTBEAT_RECORDED: 'task_heartbeat_recorded',
  TASK_CHECKPOINT_WRITTEN: 'task_checkpoint_written',
  TASK_WAITING_FOR_APPROVAL: 'task_waiting_for_approval',
  TASK_WAITING_FOR_CHILD: 'task_waiting_for_child',
  TASK_PAUSED: 'task_paused',
  TASK_RESUMED: 'task_resumed',
  TASK_COMPLETED: 'task_completed',
  TASK_FAILED: 'task_failed',
  TASK_RETRY_SCHEDULED: 'task_retry_scheduled',
  TASK_CANCELLED: 'task_cancelled',

  SPAWN_PROPOSED: 'spawn_proposed',
  SPAWN_DUPLICATE_SUPPRESSED: 'spawn_duplicate_suppressed',
  SPAWN_APPROVED: 'spawn_approved',
  SPAWN_DENIED: 'spawn_denied',
  SPAWN_EXPIRED: 'spawn_expired',
  CHILD_INSTANTIATION_STARTED: 'child_instantiation_started',
  CHILD_INSTANTIATED: 'child_instantiated',

  APPROVAL_REQUEST_CREATED: 'approval_request_created',
  APPROVAL_REQUEST_APPROVED: 'approval_request_approved',
  APPROVAL_REQUEST_DENIED: 'approval_request_denied',
  APPROVAL_REQUEST_EXPIRED: 'approval_request_expired',
  APPROVAL_REQUEST_CANCELLED: 'approval_request_cancelled',

  AGENT_READY: 'agent_ready',
  AGENT_ACTIVE: 'agent_active',
  AGENT_WAITING: 'agent_waiting',
  AGENT_PAUSED: 'agent_paused',
  AGENT_FAILED: 'agent_failed',
  AGENT_RETIRING: 'agent_retiring',
  AGENT_RETIRED: 'agent_retired',
  AGENT_ORPHANED: 'agent_orphaned',

  CHILD_RESULT_MERGE_STARTED: 'child_result_merge_started',
  CHILD_RESULT_MERGE_COMPLETED: 'child_result_merge_completed',
  CHILD_RESULT_MERGE_FAILED: 'child_result_merge_failed',
  SUBTREE_KILL_REQUESTED: 'subtree_kill_requested',
  LEASE_EXPIRED: 'lease_expired',
  MISSED_HEARTBEAT_DETECTED: 'missed_heartbeat_detected',
});

module.exports = {
  AUDIT_EVENT_TYPES,
};
