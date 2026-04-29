const assert = require('assert');
const { createSpawnApprovalService } = require('./spawnApprovalService');

function createRepositories() {
  const tasks = new Map([
    ['parent-1', {
      task_id: 'parent-1',
      root_task_id: 'root-1',
      status: 'waiting_for_approval',
      blocked_on_approval_request_id: 'approval-1',
      updated_at: '2026-04-29T00:00:00.000Z',
    }],
  ]);
  const approvalRequests = new Map([
    ['approval-1', {
      approval_request_id: 'approval-1',
      approval_kind: 'spawn_request',
      target_id: 'spawn-1',
      status: 'pending',
    }],
  ]);
  const spawnRequests = new Map([
    ['spawn-1', {
      spawn_request_id: 'spawn-1',
      parent_task_id: 'parent-1',
      root_task_id: 'root-1',
      approval_request_id: 'approval-1',
      status: 'awaiting_approval',
    }],
  ]);

  return {
    tasks: {
      async getTaskById({ task_id }) {
        return tasks.get(task_id) || null;
      },
    },
    approvalRequests: {
      async getApprovalRequestById({ approval_request_id }) {
        return approvalRequests.get(approval_request_id) || null;
      },
      async updateApprovalRequestById({ approval_request_id, patch }) {
        const current = approvalRequests.get(approval_request_id);
        if (!current) return null;
        const next = { ...current, ...patch };
        approvalRequests.set(approval_request_id, next);
        return next;
      },
    },
    spawnRequests: {
      async getSpawnRequestById({ spawn_request_id }) {
        return spawnRequests.get(spawn_request_id) || null;
      },
      async getSpawnRequestByApprovalRequestId({ approval_request_id }) {
        return Array.from(spawnRequests.values()).find((row) => row.approval_request_id === approval_request_id) || null;
      },
      async updateSpawnRequestById({ spawn_request_id, patch }) {
        const current = spawnRequests.get(spawn_request_id);
        if (!current) return null;
        const next = { ...current, ...patch };
        spawnRequests.set(spawn_request_id, next);
        return next;
      },
    },
    auditEvents: {
      async appendAuditEvent({ audit_event }) {
        return audit_event;
      },
    },
  };
}

(async () => {
  const repositories = createRepositories();
  let resumed = null;
  const service = createSpawnApprovalService({
    repositories,
    taskLifecycleService: {
      async resumeTask(input) {
        resumed = input;
        return { task_id: input.task_id, status: 'running' };
      },
    },
  });

  const result = await service.approveSpawn({
    approval_request_id: 'approval-1',
    actor_context: { actor_type: 'test', actor_id: 'tester' },
    decision_reason: 'ok',
  });

  assert.equal(result.approval_request.status, 'approved');
  assert.equal(result.spawn_request.status, 'approved');
  assert.equal(resumed.task_id, 'parent-1');
  assert.equal(resumed.reason, 'parent_resumed_after_spawn_approval');

  console.log('spawnApprovalService resume parent test passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
