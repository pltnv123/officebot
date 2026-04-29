const assert = require('assert');
const { createTaskLifecycleService } = require('./taskLifecycleService');

function createRepositories() {
  const tasks = new Map([
    ['task-parent-1', {
      task_id: 'task-parent-1',
      root_task_id: 'task-root-1',
      status: 'running',
      result_payload_json: null,
      blocked_on_spawn_request_id: null,
      blocked_on_task_id: null,
      blocked_on_approval_request_id: null,
      wait_reason: null,
      lease_owner: null,
      lease_expires_at: null,
      updated_at: '2026-04-29T00:00:00.000Z',
    }],
  ]);

  const taskEvents = [];
  const auditEvents = [];

  return {
    tasks: {
      async getTaskById({ task_id }) {
        return tasks.get(task_id) || null;
      },
      async updateTaskById({ task_id, patch }) {
        const current = tasks.get(task_id);
        if (!current) return null;
        const next = { ...current, ...patch };
        tasks.set(task_id, next);
        return next;
      },
      async createTask() {
        throw new Error('not used');
      },
    },
    taskEvents: {
      async appendTaskEvent({ event }) {
        taskEvents.push(event);
        return event;
      },
    },
    checkpoints: {},
    auditEvents: {
      async appendAuditEvent({ audit_event }) {
        auditEvents.push(audit_event);
        return audit_event;
      },
    },
    _events: taskEvents,
    _audit: auditEvents,
    _tasks: tasks,
  };
}

(async () => {
  const repositories = createRepositories();
  const service = createTaskLifecycleService({ repositories });

  const waitCarrier = {
    carrier_kind: 'taskflow_native_wait_resume',
    flow_id: 'governed:task-root-1:task-parent-1:spawn-1:task-child-1',
    current_step: 'awaiting_child_execution',
    status: 'waiting',
  };

  const waited = await service.waitForChild({
    task_id: 'task-parent-1',
    spawn_request_id: 'spawn-1',
    child_task_id: 'task-child-1',
    taskflow_wait_resume: waitCarrier,
  });

  assert.equal(waited.status, 'waiting_for_child');
  assert.equal(waited.wait_context_json.taskflow_wait_resume.flow_id, waitCarrier.flow_id);

  repositories._tasks.set('task-parent-1', {
    ...repositories._tasks.get('task-parent-1'),
    result_payload_json: {
      merged_child_result: {
        child_task_id: 'task-child-1',
        spawn_request_id: 'spawn-1',
      },
    },
  });

  const resumed = await service.resumeTask({
    task_id: 'task-parent-1',
    reason: 'parent_resumed_after_child',
    taskflow_wait_resume: {
      carrier_kind: 'taskflow_native_wait_resume',
      flow_id: waitCarrier.flow_id,
      current_step: 'resumed_after_child_merge',
      status: 'running',
    },
  });

  assert.equal(resumed.status, 'running');
  assert.equal(resumed.wait_context_json.taskflow_wait_resume.current_step, 'resumed_after_child_merge');
  assert.equal(repositories._events.length, 2);
  assert.equal(repositories._audit.length, 2);

  console.log('taskflowWaitResumeLifecycle test passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
