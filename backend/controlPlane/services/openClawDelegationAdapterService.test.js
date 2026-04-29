const assert = require('assert');
const { createOpenClawDelegationAdapterService } = require('./openClawDelegationAdapterService');

const service = createOpenClawDelegationAdapterService();

const parent_task = { task_id: 'parent-1' };
const child_task = {
  task_id: 'child-1',
  task_kind: 'implementation',
  task_scope_json: { file: 'a.js', action: 'patch' },
};
const spawn_request = {
  spawn_request_id: 'spawn-1',
  root_task_id: 'root-1',
  justification: 'bounded justification',
};
const template = {
  agent_template_id: 'tpl-1',
  version: 'v1',
};

const payload = service.materializeDelegatedChildPayload({
  parent_task,
  child_task,
  spawn_request,
  template,
});

assert.equal(payload.execution_substrate, 'openclaw_native_delegation');
assert.deepEqual(payload.role_sequence, ['planner', 'worker', 'reviewer']);
assert.equal(payload.prompts_by_role.planner.includes('Planner task:'), true);
assert.equal(payload.prompts_by_role.worker.includes('Worker task:'), true);
assert.equal(payload.prompts_by_role.reviewer.includes('Reviewer task:'), true);

const completion = service.buildChildCompletionPayload({
  child_task,
  delegation_result: { verdict: 'accepted' },
  completed_by_role: 'reviewer',
});

assert.equal(completion.execution_substrate, 'openclaw_native_delegation');
assert.equal(completion.completed_by_role, 'reviewer');
assert.deepEqual(completion.delegation_result, { verdict: 'accepted' });

console.log('openClawDelegationAdapterService tests passed');
