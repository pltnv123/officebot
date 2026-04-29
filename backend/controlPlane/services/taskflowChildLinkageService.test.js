const assert = require('assert');
const { createTaskflowChildLinkageService } = require('./taskflowChildLinkageService');

const service = createTaskflowChildLinkageService();

const linkage = service.buildChildLinkage({
  parent_task: { task_id: 'task-parent-1', root_task_id: 'task-root-1' },
  spawn_request: { spawn_request_id: 'spawn-1' },
  approval_request: { approval_request_id: 'approval-1' },
  child_task: { task_id: 'task-child-1', task_kind: 'implementation' },
  openclaw_delegation: { role_sequence: ['planner', 'worker', 'reviewer'] },
});

assert.equal(linkage.linkage_kind, 'taskflow_native_child_linkage');
assert.equal(linkage.flow_model, 'managed_flow_intent');
assert.equal(linkage.flow_id, 'governed:task-root-1:task-parent-1:spawn-1:task-child-1');
assert.equal(linkage.execution_substrate, 'openclaw_native_delegation');
assert.deepEqual(linkage.role_sequence, ['planner', 'worker', 'reviewer']);

const execution = service.buildExecutionLinkage({
  child_task: { task_id: 'task-child-1' },
  taskflow_child_linkage: linkage,
  delegation_plan: { steps: [{}, {}, {}] },
});

assert.equal(execution.linkage_kind, 'taskflow_native_child_execution');
assert.equal(execution.flow_id, linkage.flow_id);
assert.equal(execution.linked_delegation_steps, 3);

const completion = service.buildCompletionLinkage({
  child_task: { task_id: 'task-child-1' },
  taskflow_child_linkage: linkage,
  completed_by_role: 'reviewer',
});

assert.equal(completion.linkage_kind, 'taskflow_native_child_completion');
assert.equal(completion.completed_by_role, 'reviewer');

console.log('taskflowChildLinkageService test passed');
