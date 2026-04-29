const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createTaskLifecycleService } = require('../services/taskLifecycleService');
const { createSpawnProposalService } = require('../services/spawnProposalService');
const { createSpawnApprovalService } = require('../services/spawnApprovalService');
const { createSpawnInstantiationService } = require('../services/spawnInstantiationService');
const { createParentChildCoordinationService } = require('../services/parentChildCoordinationService');
const { createChildExecutionService } = require('../services/childExecutionService');
const { createGovernedDemoPackagingService } = require('../services/governedDemoPackagingService');
const { createOpenClawDelegationAdapterService } = require('../services/openClawDelegationAdapterService');
const { createOpenClawWorkflowSurfaceService } = require('../services/openClawWorkflowSurfaceService');

async function runFirstGovernedWorkflowWalkthrough({ rootDir, reset = false } = {}) {
  if (!rootDir) {
    throw new Error('runFirstGovernedWorkflowWalkthrough requires rootDir');
  }

  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  if (reset) {
    await adapter.clearRuntimeState();
  }

  const repositories = adapter.repositories;
  const taskLifecycleService = createTaskLifecycleService({ repositories });
  const openClawDelegationAdapterService = createOpenClawDelegationAdapterService();
  const spawnProposalService = createSpawnProposalService({ repositories, taskLifecycleService });
  const spawnApprovalService = createSpawnApprovalService({ repositories, taskLifecycleService });
  const spawnInstantiationService = createSpawnInstantiationService({ repositories, openClawDelegationAdapterService });
  const parentChildCoordinationService = createParentChildCoordinationService({ repositories, taskLifecycleService });
  const childExecutionService = createChildExecutionService({ repositories, taskLifecycleService, openClawDelegationAdapterService });
  const governedDemoPackagingService = createGovernedDemoPackagingService({
    repositories,
    spawnProposalService,
    spawnApprovalService,
    spawnInstantiationService,
    parentChildCoordinationService,
    childExecutionService,
  });

  const parentTaskId = 'governed-parent-task-1';
  const existingParent = await repositories.tasks.getTaskById({ task_id: parentTaskId });
  if (!existingParent) {
    await taskLifecycleService.createTask({
      task_definition: {
        task_id: parentTaskId,
        root_task_id: parentTaskId,
        task_kind: 'governed_parent',
        status: 'created',
        priority: 0,
        task_scope_json: { objective: 'first_governed_workflow' },
        input_payload_json: { source: 'bounded_demo_packager' },
        spawn_depth: 0,
        active_child_count: 0,
        spawn_budget_used: 0,
        spawn_budget_limit: 1,
        retry_count: 0,
        max_retries: 0,
        checkpoint_seq: 0,
      },
      actor_context: { actor_type: 'system', actor_id: 'runFirstGovernedWorkflowWalkthrough' },
    });
    await taskLifecycleService.markTaskReady({
      task_id: parentTaskId,
      actor_context: { actor_type: 'system', actor_id: 'runFirstGovernedWorkflowWalkthrough' },
      reason: 'prepare_parent_task',
    });
    await taskLifecycleService.claimTask({
      task_id: parentTaskId,
      lease_owner: 'openclaw:main',
      actor_context: { actor_type: 'system', actor_id: 'runFirstGovernedWorkflowWalkthrough' },
    });
    await taskLifecycleService.startTask({
      task_id: parentTaskId,
      actor_context: { actor_type: 'system', actor_id: 'runFirstGovernedWorkflowWalkthrough' },
    });
  }

  const result = await governedDemoPackagingService.runGovernedDemoWalkthrough({
    parent_task_id: parentTaskId,
    approve_branch: {
      correlation_id: 'first-governed-approve-branch',
      agent_template_id: 'v1-ephemeral-child-worker',
      agent_template_version: 'v1',
      child_task_kind: 'implementation',
      child_task_scope_json: { objective: 'materialize_real_governed_instance' },
      requested_by: 'openclaw',
      creation_reason: 'materialize_real_governed_instance',
      justification: 'Need one real persisted first governed workflow instance.',
      parent_agent_id: 'main',
      spawn_request_id: 'governed-spawn-request-1',
      child_task_id: 'governed-child-task-1',
      child_agent_id: 'governed-child-agent-1',
      lease_owner: 'openclaw:planner-worker-reviewer',
      checkpoint_id: 'governed-child-checkpoint-1',
      checkpoint_kind: 'bounded_progress',
      checkpoint_payload_json: { phase: 'worker_complete' },
      checkpoint_created_by: 'worker',
      child_result_payload_json: { accepted: true, notes: 'bounded walkthrough complete' },
    },
    deny_branch: {
      correlation_id: 'first-governed-deny-branch',
      agent_template_id: 'v1-ephemeral-child-worker',
      agent_template_version: 'v1',
      child_task_kind: 'implementation',
      child_task_scope_json: { objective: 'denied_branch_control' },
      requested_by: 'openclaw',
      creation_reason: 'denied_branch_control',
      justification: 'Need denied branch evidence for bounded governed demo.',
      parent_agent_id: 'main',
      spawn_request_id: 'governed-spawn-request-denied-1',
    },
    actor_context: {
      actor_type: 'system',
      actor_id: 'runFirstGovernedWorkflowWalkthrough',
    },
  });

  const proof = await governedDemoPackagingService.collectGovernedDemoProof({
    parent_task_id: parentTaskId,
    approved_spawn_request_id: result.approve_branch.proposed.spawn_request.spawn_request_id,
    approved_approval_request_id: result.approve_branch.proposed.approval_request.approval_request_id,
    child_task_id: result.approve_branch.instantiated.child_task.task_id,
    denied_spawn_request_id: result.deny_branch.proposed.spawn_request.spawn_request_id,
    denied_approval_request_id: result.deny_branch.proposed.approval_request.approval_request_id,
  });

  const openClawWorkflowSurfaceService = createOpenClawWorkflowSurfaceService();
  const childTaskEvents = await repositories.taskEvents.listTaskEventsByTaskId({
    task_id: result.approve_branch.instantiated.child_task.task_id,
    sort: 'asc',
  });
  const auditTrail = await repositories.auditEvents.listAuditEventsByCorrelation({
    related_spawn_request_id: result.approve_branch.proposed.spawn_request.spawn_request_id,
    related_approval_request_id: result.approve_branch.proposed.approval_request.approval_request_id,
    related_task_id: result.approve_branch.instantiated.child_task.task_id,
    limit: 200,
  });

  const workflowSurface = openClawWorkflowSurfaceService.buildWorkflowSurface({
    parent_task: proof.parent_snapshot.task,
    child_task: proof.child_snapshot.task,
    spawn_request: proof.approved_branch.spawn_request,
    approval_request: proof.approved_branch.approval_request,
    child_task_events: childTaskEvents,
    audit_trail: auditTrail,
    source_surface: 'file_backed_first_governed_workflow_runtime',
  });

  return {
    repositories,
    proof,
    workflowSurface,
    ids: {
      parentTaskId: proof.parent_snapshot.task.task_id,
      childTaskId: proof.child_snapshot.task.task_id,
      spawnRequestId: proof.approved_branch.spawn_request.spawn_request_id,
      approvalRequestId: proof.approved_branch.approval_request.approval_request_id,
      governed_flow_id: workflowSurface.ids.governed_flow_id,
    },
    stateFile: adapter.stateFile,
  };
}

module.exports = {
  runFirstGovernedWorkflowWalkthrough,
};
