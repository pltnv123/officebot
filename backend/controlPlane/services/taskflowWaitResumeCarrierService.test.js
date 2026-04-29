const assert = require('assert');
const { createTaskflowWaitResumeCarrierService } = require('./taskflowWaitResumeCarrierService');

const service = createTaskflowWaitResumeCarrierService();

const waiting = service.buildWaitingForChildCarrier({
  parent_task: {
    task_id: 'task-parent-1',
    root_task_id: 'task-root-1',
  },
  spawn_request: {
    spawn_request_id: 'spawn-1',
  },
  child_task_id: 'task-child-1',
});

assert.equal(waiting.carrier_kind, 'taskflow_native_wait_resume');
assert.equal(waiting.flow_model, 'managed_flow_intent');
assert.equal(waiting.status, 'waiting');
assert.equal(waiting.wait_json.kind, 'child_task');
assert.equal(waiting.wait_json.spawn_request_id, 'spawn-1');
assert.equal(waiting.state_json.child_task_id, 'task-child-1');

const resumed = service.buildResumeCarrier({
  parent_task: {
    task_id: 'task-parent-1',
    root_task_id: 'task-root-1',
  },
  merged_child_result: {
    child_task_id: 'task-child-1',
  },
  resumed_from_child_task_id: 'task-child-1',
  resumed_from_spawn_request_id: 'spawn-1',
});

assert.equal(resumed.carrier_kind, 'taskflow_native_wait_resume');
assert.equal(resumed.status, 'running');
assert.equal(resumed.wait_json, null);
assert.equal(resumed.state_json.merged_child_result_present, true);
assert.equal(resumed.state_json.resumed_from_spawn_request_id, 'spawn-1');

console.log('taskflowWaitResumeCarrierService test passed');
