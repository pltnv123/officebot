const assert = require('assert');
const { createSpawnInstantiationService } = require('./spawnInstantiationService');
const { createChildExecutionService } = require('./childExecutionService');
const { createOpenClawDelegationAdapterService } = require('./openClawDelegationAdapterService');

function createRepositories() {
  const tasks = new Map([
    ['task-parent-1', {
      task_id: 'task-parent-1',
      root_task_id: 'task-root-1',
      parent_task_id: null,
      status: 'running',
      task_kind: 'governed_parent',
      input_payload_json: null,
      result_payload_json: null,
      checkpoint_seq: 0,
    }],
  ]);

  const spawnRequests = new Map([
    ['spawn-1', {
      spawn_request_id: 'spawn-1',
      root_task_id: 'task-root-1',
      parent_task_id: 'task-parent-1',
      parent_agent_id: 'main',
      approval_request_id: 'approval-1',
      agent_template_id: 'template-1',
      agent_template_version: 'v1',
      child_task_kind: 'implementation',
      child_task_scope_json: { scope: 'bounded' },
      creation_reason: 'test',
      justification: 'test-linkage',
      status: 'approved',
      instantiated_task_id: null,
      instantiated_agent_id: null,
      updated_at: '2026-04-29T00:00:00.000Z',
    }],
  ]);

  const approvalRequests = new Map([
    ['approval-1', {
      approval_request_id: 'approval-1',
      approval_kind: 'spawn_request',
      status: 'approved',
      target_id: 'spawn-1',
    }],
  ]);

  const templates = new Map([
    ['template-1:v1', {
      agent_template_id: 'template-1',
      version: 'v1',
      enabled: true,
      agent_class: 'worker',
      agent_kind: 'bounded',
      capabilities_json: [],
      policy_boundary_class: 'bounded',
      ttl_seconds: 3600,
    }],
  ]);

  return {
    tasks: {
      async getTaskById({ task_id }) {
        return tasks.get(task_id) || null;
      },
      async createTask({ task }) {
        tasks.set(task.task_id, task);
        return task;
      },
      async updateTaskById({ task_id, patch }) {
        const current = tasks.get(task_id);
        if (!current) return null;
        const next = { ...current, ...patch };
        tasks.set(task_id, next);
        return next;
      },
    },
    spawnRequests: {
      async getSpawnRequestById({ spawn_request_id }) {
        return spawnRequests.get(spawn_request_id) || null;
      },
      async updateSpawnRequestById({ spawn_request_id, patch }) {
        const current = spawnRequests.get(spawn_request_id);
        if (!current) return null;
        const next = { ...current, ...patch };
        spawnRequests.set(spawn_request_id, next);
        return next;
      },
    },
    approvalRequests: {
      async getApprovalRequestById({ approval_request_id }) {
        return approvalRequests.get(approval_request_id) || null;
      },
    },
    agentTemplates: {
      async getAgentTemplateByIdAndVersion({ agent_template_id, version }) {
        return templates.get(`${agent_template_id}:${version}`) || null;
      },
    },
    agentRegistry: {
      async createAgent({ agent }) {
        return agent;
      },
    },
    auditEvents: {
      async appendAuditEvent({ audit_event }) {
        return audit_event;
      },
    },
    taskEvents: {
      async appendTaskEvent({ event }) {
        return event;
      },
    },
    checkpoints: {
      async appendCheckpoint({ checkpoint }) {
        return checkpoint;
      },
    },
  };
}

(async () => {
  const repositories = createRepositories();
  const adapter = createOpenClawDelegationAdapterService();

  const taskLifecycleService = {
    async markTaskReady({ task_id }) {
      return repositories.tasks.updateTaskById({ task_id, patch: { status: 'ready' } });
    },
    async claimTask({ task_id, lease_owner, lease_expires_at }) {
      return repositories.tasks.updateTaskById({ task_id, patch: { status: 'claimed', lease_owner, lease_expires_at } });
    },
    async startTask({ task_id }) {
      return repositories.tasks.updateTaskById({ task_id, patch: { status: 'running' } });
    },
    async recordCheckpoint({ task_id }) {
      const current = await repositories.tasks.getTaskById({ task_id });
      return { task: await repositories.tasks.updateTaskById({ task_id, patch: { checkpoint_seq: (current.checkpoint_seq || 0) + 1 } }), checkpoint: { checkpoint_id: 'cp-1' } };
    },
    async completeTask({ task_id, result_payload_json }) {
      return repositories.tasks.updateTaskById({ task_id, patch: { status: 'completed', result_payload_json } });
    },
  };

  const instantiation = createSpawnInstantiationService({
    repositories,
    openClawDelegationAdapterService: adapter,
  });

  const instantiated = await instantiation.instantiateApprovedSpawn({
    spawn_request_id: 'spawn-1',
    child_task_id: 'task-child-1',
    actor_context: { actor_type: 'test', actor_id: 'test' },
  });

  assert.equal(instantiated.child_task.input_payload_json.taskflow_child_linkage.linkage_kind, 'taskflow_native_child_linkage');
  assert.equal(instantiated.child_task.input_payload_json.taskflow_child_linkage.flow_id, 'governed:task-root-1:task-parent-1:spawn-1:task-child-1');

  const childExecution = createChildExecutionService({
    repositories,
    taskLifecycleService,
    openClawDelegationAdapterService: adapter,
  });

  const started = await childExecution.startChildExecution({
    task_id: 'task-child-1',
    actor_context: { actor_type: 'test', actor_id: 'test' },
  });

  assert.equal(started.taskflow_child_execution_linkage.linkage_kind, 'taskflow_native_child_execution');
  assert.equal(started.taskflow_child_execution_linkage.flow_id, 'governed:task-root-1:task-parent-1:spawn-1:task-child-1');

  const completed = await childExecution.completeChildExecution({
    task_id: 'task-child-1',
    result_payload_json: { ok: true },
    actor_context: { actor_type: 'test', actor_id: 'test' },
  });

  assert.equal(completed.taskflow_child_completion_linkage.linkage_kind, 'taskflow_native_child_completion');
  assert.equal(completed.taskflow_child_completion_linkage.completed_by_role, 'reviewer');

  console.log('taskflowChildLinkageLifecycle test passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
