// V1 control-plane vocabulary only.
// No transition logic belongs here.
// Lifecycle ownership is intentionally centralized elsewhere.
// Repositories must not infer authority from these constants alone.

const AGENT_STATES = Object.freeze({
  READY: 'ready',
  ACTIVE: 'active',
  WAITING: 'waiting',
  PAUSED: 'paused',
  FAILED: 'failed',
  RETIRING: 'retiring',
  RETIRED: 'retired',
  ORPHANED: 'orphaned',
});

const TERMINAL_AGENT_STATES = Object.freeze([
  AGENT_STATES.RETIRED,
]);

const ACTIVE_NON_TERMINAL_AGENT_STATES = Object.freeze([
  AGENT_STATES.READY,
  AGENT_STATES.ACTIVE,
  AGENT_STATES.WAITING,
  AGENT_STATES.PAUSED,
  AGENT_STATES.RETIRING,
]);

const EXCEPTIONAL_NON_TERMINAL_AGENT_STATES = Object.freeze([
  AGENT_STATES.FAILED,
  AGENT_STATES.ORPHANED,
]);

const NON_TERMINAL_AGENT_STATES = Object.freeze([
  ...ACTIVE_NON_TERMINAL_AGENT_STATES,
  ...EXCEPTIONAL_NON_TERMINAL_AGENT_STATES,
]);

module.exports = {
  AGENT_STATES,
  TERMINAL_AGENT_STATES,
  ACTIVE_NON_TERMINAL_AGENT_STATES,
  EXCEPTIONAL_NON_TERMINAL_AGENT_STATES,
  NON_TERMINAL_AGENT_STATES,
};
