// V1 control-plane transition guard contract only.
// No service behavior, repository behavior, spawn execution, or approval execution belongs here.
// This module defines allowed lifecycle transitions and explicit deny-rules for later enforcement.
// Lifecycle transitions may only be mediated by the service layer.
// Repositories, routes, and helper chains must not mutate lifecycle state based on these contracts alone.

const { TASK_STATES } = require('../types/taskStates');
const { AGENT_STATES } = require('../types/agentStates');
const { SPAWN_REQUEST_STATES } = require('../types/spawnRequestStates');
const { APPROVAL_STATES } = require('../types/approvalStates');

const LIFECYCLE_OWNERSHIP_CONTRACT = Object.freeze({
  owner: 'service_layer_only',
  rule: 'Lifecycle transitions may only be mediated by centralized control-plane services.',
  forbidden_mutators: Object.freeze([
    'repositories',
    'routes',
    'helper_chains',
    'ad_hoc_runtime_builders',
  ]),
  note: 'These transition maps are contracts for later enforcement and validation. They do not perform transitions by themselves.',
});

const TASK_STATE_TRANSITIONS = Object.freeze({
  [TASK_STATES.CREATED]: Object.freeze([
    TASK_STATES.READY,
  ]),
  [TASK_STATES.READY]: Object.freeze([
    TASK_STATES.CLAIMED,
    TASK_STATES.CANCELLED,
  ]),
  [TASK_STATES.CLAIMED]: Object.freeze([
    TASK_STATES.RUNNING,
    TASK_STATES.CANCELLED,
  ]),
  [TASK_STATES.RUNNING]: Object.freeze([
    TASK_STATES.WAITING_FOR_APPROVAL,
    TASK_STATES.WAITING_FOR_CHILD,
    TASK_STATES.PAUSED,
    TASK_STATES.COMPLETED,
    TASK_STATES.FAILED,
    TASK_STATES.CANCELLED,
  ]),
  [TASK_STATES.WAITING_FOR_APPROVAL]: Object.freeze([
    TASK_STATES.RUNNING,
    TASK_STATES.CANCELLED,
  ]),
  [TASK_STATES.WAITING_FOR_CHILD]: Object.freeze([
    TASK_STATES.RUNNING,
    TASK_STATES.FAILED,
    TASK_STATES.CANCELLED,
  ]),
  [TASK_STATES.PAUSED]: Object.freeze([
    TASK_STATES.READY,
    TASK_STATES.CANCELLED,
  ]),
  [TASK_STATES.RETRY_SCHEDULED]: Object.freeze([
    TASK_STATES.READY,
    TASK_STATES.CANCELLED,
  ]),
  [TASK_STATES.COMPLETED]: Object.freeze([]),
  [TASK_STATES.FAILED]: Object.freeze([
    TASK_STATES.RETRY_SCHEDULED,
  ]),
  [TASK_STATES.CANCELLED]: Object.freeze([]),
});

const AGENT_STATE_TRANSITIONS = Object.freeze({
  [AGENT_STATES.READY]: Object.freeze([
    AGENT_STATES.ACTIVE,
    AGENT_STATES.RETIRING,
  ]),
  [AGENT_STATES.ACTIVE]: Object.freeze([
    AGENT_STATES.WAITING,
    AGENT_STATES.PAUSED,
    AGENT_STATES.FAILED,
    AGENT_STATES.RETIRING,
    AGENT_STATES.ORPHANED,
  ]),
  [AGENT_STATES.WAITING]: Object.freeze([
    AGENT_STATES.ACTIVE,
    AGENT_STATES.RETIRING,
    AGENT_STATES.ORPHANED,
  ]),
  [AGENT_STATES.PAUSED]: Object.freeze([
    AGENT_STATES.ACTIVE,
    AGENT_STATES.RETIRING,
    AGENT_STATES.ORPHANED,
  ]),
  [AGENT_STATES.FAILED]: Object.freeze([
    AGENT_STATES.RETIRING,
  ]),
  [AGENT_STATES.RETIRING]: Object.freeze([
    AGENT_STATES.RETIRED,
  ]),
  [AGENT_STATES.RETIRED]: Object.freeze([]),
  [AGENT_STATES.ORPHANED]: Object.freeze([
    AGENT_STATES.RETIRING,
  ]),
});

const SPAWN_REQUEST_STATE_TRANSITIONS = Object.freeze({
  [SPAWN_REQUEST_STATES.PROPOSED]: Object.freeze([
    SPAWN_REQUEST_STATES.AWAITING_APPROVAL,
    SPAWN_REQUEST_STATES.DUPLICATE_SUPPRESSED,
    SPAWN_REQUEST_STATES.CANCELLED,
  ]),
  [SPAWN_REQUEST_STATES.AWAITING_APPROVAL]: Object.freeze([
    SPAWN_REQUEST_STATES.APPROVED,
    SPAWN_REQUEST_STATES.DENIED,
    SPAWN_REQUEST_STATES.EXPIRED,
    SPAWN_REQUEST_STATES.CANCELLED,
  ]),
  [SPAWN_REQUEST_STATES.APPROVED]: Object.freeze([
    SPAWN_REQUEST_STATES.INSTANTIATING,
    SPAWN_REQUEST_STATES.CANCELLED,
  ]),
  [SPAWN_REQUEST_STATES.INSTANTIATING]: Object.freeze([
    SPAWN_REQUEST_STATES.INSTANTIATED,
    SPAWN_REQUEST_STATES.CANCELLED,
  ]),
  [SPAWN_REQUEST_STATES.INSTANTIATED]: Object.freeze([]),
  [SPAWN_REQUEST_STATES.DENIED]: Object.freeze([]),
  [SPAWN_REQUEST_STATES.EXPIRED]: Object.freeze([]),
  [SPAWN_REQUEST_STATES.CANCELLED]: Object.freeze([]),
  [SPAWN_REQUEST_STATES.DUPLICATE_SUPPRESSED]: Object.freeze([]),
});

const APPROVAL_STATE_TRANSITIONS = Object.freeze({
  [APPROVAL_STATES.PENDING]: Object.freeze([
    APPROVAL_STATES.APPROVED,
    APPROVAL_STATES.DENIED,
    APPROVAL_STATES.EXPIRED,
    APPROVAL_STATES.CANCELLED,
  ]),
  [APPROVAL_STATES.APPROVED]: Object.freeze([]),
  [APPROVAL_STATES.DENIED]: Object.freeze([]),
  [APPROVAL_STATES.EXPIRED]: Object.freeze([]),
  [APPROVAL_STATES.CANCELLED]: Object.freeze([]),
});

const V1_DENY_RULES_CONTRACT = Object.freeze({
  child_may_not_propose_spawn: Object.freeze({
    rule: 'Tasks or agents at spawn_depth >= 1 may not create new spawn proposals in v1.',
    enforceable_as: 'deny proposal when parent task or parent agent spawn_depth is greater than or equal to 1',
  }),

  no_dynamic_template_creation: Object.freeze({
    rule: 'Templates may not be created dynamically at runtime in v1.',
    enforceable_as: 'deny any template creation path outside approved bootstrap/seed flow',
  }),

  recursion_depth_cap: Object.freeze({
    rule: 'Maximum spawn depth is 1 in v1.',
    enforceable_as: 'deny spawn when resulting child depth would exceed 1',
    max_depth: 1,
  }),

  max_active_child_count: Object.freeze({
    rule: 'A parent task may have at most one active child at a time in v1.',
    enforceable_as: 'deny spawn when parent active_child_count is greater than or equal to 1',
    max_count: 1,
  }),

  no_auto_approved_spawn: Object.freeze({
    rule: 'Spawn requests may not bypass explicit approval in v1.',
    enforceable_as: 'deny any path that would instantiate a child without approval_request and approval state resolution',
  }),
});

const TRANSITION_GUARD_CONTRACT = Object.freeze({
  lifecycle_ownership: LIFECYCLE_OWNERSHIP_CONTRACT,
  task_state_transitions: TASK_STATE_TRANSITIONS,
  agent_state_transitions: AGENT_STATE_TRANSITIONS,
  spawn_request_state_transitions: SPAWN_REQUEST_STATE_TRANSITIONS,
  approval_state_transitions: APPROVAL_STATE_TRANSITIONS,
  v1_deny_rules: V1_DENY_RULES_CONTRACT,
});

module.exports = {
  LIFECYCLE_OWNERSHIP_CONTRACT,
  TASK_STATE_TRANSITIONS,
  AGENT_STATE_TRANSITIONS,
  SPAWN_REQUEST_STATE_TRANSITIONS,
  APPROVAL_STATE_TRANSITIONS,
  V1_DENY_RULES_CONTRACT,
  TRANSITION_GUARD_CONTRACT,
};
