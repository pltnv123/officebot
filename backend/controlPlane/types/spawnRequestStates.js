// V1 control-plane vocabulary only.
// No transition logic belongs here.
// Lifecycle ownership is intentionally centralized elsewhere.
// Repositories must not infer authority from these constants alone.

const SPAWN_REQUEST_STATES = Object.freeze({
  PROPOSED: 'proposed',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
  DENIED: 'denied',
  INSTANTIATING: 'instantiating',
  INSTANTIATED: 'instantiated',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  DUPLICATE_SUPPRESSED: 'duplicate_suppressed',
});

const TERMINAL_SPAWN_REQUEST_STATES = Object.freeze([
  SPAWN_REQUEST_STATES.DENIED,
  SPAWN_REQUEST_STATES.INSTANTIATED,
  SPAWN_REQUEST_STATES.EXPIRED,
  SPAWN_REQUEST_STATES.CANCELLED,
  SPAWN_REQUEST_STATES.DUPLICATE_SUPPRESSED,
]);

const NON_TERMINAL_SPAWN_REQUEST_STATES = Object.freeze([
  SPAWN_REQUEST_STATES.PROPOSED,
  SPAWN_REQUEST_STATES.AWAITING_APPROVAL,
  SPAWN_REQUEST_STATES.APPROVED,
  SPAWN_REQUEST_STATES.INSTANTIATING,
]);

module.exports = {
  SPAWN_REQUEST_STATES,
  TERMINAL_SPAWN_REQUEST_STATES,
  NON_TERMINAL_SPAWN_REQUEST_STATES,
};
