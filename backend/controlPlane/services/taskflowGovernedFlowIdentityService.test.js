const assert = require('assert');
const { createTaskflowGovernedFlowIdentityService } = require('./taskflowGovernedFlowIdentityService');

const service = createTaskflowGovernedFlowIdentityService();

const identity = service.buildGovernedFlowIdentity({
  parent_task: {
    task_id: 'task-parent-1',
    root_task_id: 'task-root-1',
    blocked_on_approval_request_id: 'approval-1',
  },
  spawn_request: {
    spawn_request_id: 'spawn-1',
    approval_request_id: 'approval-1',
    instantiated_task_id: 'task-child-1',
  },
  child_task: {
    task_id: 'task-child-1',
  },
  execution_substrate: 'openclaw_native_delegation',
  current_step: 'child_running',
  role_sequence: ['planner', 'worker', 'reviewer'],
});

assert.equal(identity.identity_kind, 'taskflow_native_governed_flow_identity');
assert.equal(identity.flow_model, 'managed_flow_intent');
assert.equal(identity.flow_id, 'governed:task-root-1:task-parent-1:spawn-1:task-child-1');
assert.equal(identity.owner_session, 'main');
assert.equal(identity.parent_task_id, 'task-parent-1');
assert.equal(identity.child_task_id, 'task-child-1');
assert.equal(identity.spawn_request_id, 'spawn-1');
assert.equal(identity.approval_request_id, 'approval-1');
assert.equal(identity.execution_substrate, 'openclaw_native_delegation');
assert.equal(identity.current_step, 'child_running');
assert.deepEqual(identity.role_sequence, ['planner', 'worker', 'reviewer']);

console.log('taskflowGovernedFlowIdentityService test passed');
