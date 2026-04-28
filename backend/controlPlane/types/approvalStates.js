// V1 control-plane vocabulary only.
// No transition logic belongs here.
// Lifecycle ownership is intentionally centralized elsewhere.
// Repositories must not infer authority from these constants alone.

const APPROVAL_STATES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

const TERMINAL_APPROVAL_STATES = Object.freeze([
  APPROVAL_STATES.APPROVED,
  APPROVAL_STATES.DENIED,
  APPROVAL_STATES.EXPIRED,
  APPROVAL_STATES.CANCELLED,
]);

const NON_TERMINAL_APPROVAL_STATES = Object.freeze([
  APPROVAL_STATES.PENDING,
]);

module.exports = {
  APPROVAL_STATES,
  TERMINAL_APPROVAL_STATES,
  NON_TERMINAL_APPROVAL_STATES,
};
