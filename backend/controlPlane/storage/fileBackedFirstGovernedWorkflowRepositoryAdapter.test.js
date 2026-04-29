const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');

(async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'first-governed-repo-'));
  const backendDir = path.join(rootDir, 'backend', 'controlPlane', 'storage');
  await fs.mkdir(backendDir, { recursive: true });

  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();

  await adapter.repositories.tasks.createTask({
    task: {
      task_id: 'task-parent-1',
      root_task_id: 'task-root-1',
      task_kind: 'governed_parent',
      status: 'running',
      priority: 0,
      task_scope_json: {},
      input_payload_json: {},
      spawn_depth: 0,
      active_child_count: 0,
      spawn_budget_used: 0,
      spawn_budget_limit: 1,
      retry_count: 0,
      max_retries: 0,
      checkpoint_seq: 0,
      created_at: '2026-04-29T00:00:00.000Z',
      updated_at: '2026-04-29T00:00:00.000Z',
    },
  });

  const template = await adapter.repositories.agentTemplates.getAgentTemplateByIdAndVersion({
    agent_template_id: 'v1-ephemeral-child-worker',
    version: 'v1',
  });
  assert.equal(template.agent_kind, 'ephemeral_child');
  assert.equal(template.spawn_requires_approval, true);

  await adapter.repositories.spawnRequests.createSpawnRequest({
    spawn_request: {
      spawn_request_id: 'spawn-1',
      parent_task_id: 'task-parent-1',
      root_task_id: 'task-root-1',
      child_task_kind: 'implementation',
      child_task_scope_json: { scope: 'bounded' },
      agent_template_id: 'v1-ephemeral-child-worker',
      agent_template_version: 'v1',
      status: 'awaiting_approval',
      spawn_intent_hash: 'hash-1',
      requested_by: 'test',
      creation_reason: 'test',
      justification: 'test',
      approval_required: true,
      approval_request_id: 'approval-1',
      created_at: '2026-04-29T00:00:00.000Z',
      updated_at: '2026-04-29T00:00:00.000Z',
    },
  });

  await adapter.repositories.approvalRequests.createApprovalRequest({
    approval_request: {
      approval_request_id: 'approval-1',
      approval_kind: 'spawn_request',
      target_id: 'spawn-1',
      status: 'pending',
      requested_at: '2026-04-29T00:00:00.000Z',
      requested_by: 'test',
      reason: 'test',
    },
  });

  const spawnByApproval = await adapter.repositories.spawnRequests.getSpawnRequestByApprovalRequestId({ approval_request_id: 'approval-1' });
  assert.equal(spawnByApproval.spawn_request_id, 'spawn-1');

  await adapter.repositories.taskEvents.appendTaskEvent({
    event: {
      event_id: 'evt-1',
      task_id: 'task-parent-1',
      event_type: 'task_started',
      event_payload_json: {},
      created_at: '2026-04-29T00:00:01.000Z',
      agent_id: null,
    },
  });

  await adapter.repositories.auditEvents.appendAuditEvent({
    audit_event: {
      audit_event_id: 'aud-1',
      event_type: 'spawn_approved',
      occurred_at: '2026-04-29T00:00:02.000Z',
      entity_type: 'spawn_request',
      entity_id: 'spawn-1',
      root_task_id: 'task-root-1',
      related_task_id: 'task-parent-1',
      related_agent_id: null,
      related_spawn_request_id: 'spawn-1',
      related_approval_request_id: 'approval-1',
      actor_type: 'system',
      actor_id: 'test',
      correlation_id: 'task-root-1',
      payload_summary: {},
      payload_ref: null,
      payload_detail_intent: 'test',
      append_only: true,
    },
  });

  const auditTrail = await adapter.repositories.auditEvents.listAuditEventsByCorrelation({
    related_spawn_request_id: 'spawn-1',
    related_approval_request_id: 'approval-1',
    related_task_id: 'task-parent-1',
  });
  assert.equal(auditTrail.length, 1);

  console.log('fileBackedFirstGovernedWorkflowRepositoryAdapter test passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
