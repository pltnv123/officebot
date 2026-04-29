// V1 governed demo packaging service.
// This module packages one fixed, repeatable governed demo walkthrough over already accepted control-plane services.
// It does not introduce new governance semantics, runtime substrate behavior, background workers,
// API wiring, or broad orchestration policy.

const GOVERNED_DEMO_SCENARIO = Object.freeze({
  scenario_name: 'first_governed_demo_checkpoint',
  scenario_version: 'v1',
  deterministic_steps: Object.freeze([
    'propose',
    'approve',
    'instantiate',
    'wait_for_child',
    'start_child_execution',
    'record_child_progress',
    'complete_child_execution',
    'merge_back',
    'resume_parent',
    'deny_branch',
  ]),
  proof_requirements: Object.freeze([
    'spawn_request_created',
    'approval_request_created',
    'approval_request_approved',
    'spawn_approved',
    'child_instantiation_started',
    'child_instantiated',
    'task_waiting_for_child',
    'task_started',
    'task_checkpoint_written',
    'task_completed',
    'child_result_merge_started',
    'child_result_merge_completed',
    'task_resumed',
    'approval_request_denied',
    'spawn_denied',
  ]),
});

const GOVERNED_DEMO_PACKAGING_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'governedDemoPackagingService',
    service_role: 'bounded_repeatable_governed_demo_walkthrough_packager',
    ownership_rule: 'The service layer may package accepted governed flows into one deterministic walkthrough without changing governance semantics.',
    forbidden_direct_mutators: Object.freeze([
      'repositories',
      'routes',
      'runtime_builders',
      'background_workers',
      'ad_hoc_demo_logic_outside_service_layer',
    ]),
  }),

  implemented_methods: Object.freeze([
    'getFixedGovernedDemoScenario',
    'runGovernedDemoWalkthrough',
    'collectGovernedDemoProof',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'new governance logic',
    'runtime substrate',
    'background workers',
    'broad orchestration policies',
    'operator UI',
    'API/runtime integration',
  ]),
});

function createGovernedDemoPackagingService({
  repositories,
  spawnProposalService,
  spawnApprovalService,
  spawnInstantiationService,
  parentChildCoordinationService,
  childExecutionService,
} = {}) {
  if (!repositories
    || !repositories.tasks
    || !repositories.taskEvents
    || !repositories.checkpoints
    || !repositories.auditEvents) {
    throw new Error('governedDemoPackagingService requires repositories.tasks, repositories.taskEvents, repositories.checkpoints, and repositories.auditEvents');
  }

  if (!spawnProposalService || typeof spawnProposalService.proposeSpawn !== 'function') {
    throw new Error('governedDemoPackagingService requires spawnProposalService.proposeSpawn');
  }

  if (!spawnApprovalService
    || typeof spawnApprovalService.approveSpawn !== 'function'
    || typeof spawnApprovalService.denySpawn !== 'function') {
    throw new Error('governedDemoPackagingService requires spawnApprovalService approve/deny methods');
  }

  if (!spawnInstantiationService || typeof spawnInstantiationService.instantiateApprovedSpawn !== 'function') {
    throw new Error('governedDemoPackagingService requires spawnInstantiationService.instantiateApprovedSpawn');
  }

  if (!parentChildCoordinationService
    || typeof parentChildCoordinationService.enterParentWaitingForChild !== 'function'
    || typeof parentChildCoordinationService.mergeCompletedChildResultIntoParent !== 'function'
    || typeof parentChildCoordinationService.resumeParentAfterChildMerge !== 'function') {
    throw new Error('governedDemoPackagingService requires parentChildCoordinationService waiting, merge, and resume methods');
  }

  if (!childExecutionService
    || typeof childExecutionService.startChildExecution !== 'function'
    || typeof childExecutionService.recordChildProgress !== 'function'
    || typeof childExecutionService.completeChildExecution !== 'function') {
    throw new Error('governedDemoPackagingService requires childExecutionService execution methods');
  }

  function buildActorContext({ actor_context = {}, scenario_name, correlation_id }) {
    return Object.freeze({
      actor_type: actor_context.actor_type || 'system',
      actor_id: actor_context.actor_id || 'governedDemoPackagingService',
      correlation_id: correlation_id || actor_context.correlation_id || `${scenario_name}:correlation`,
    });
  }

  async function collectTaskSnapshot(task_id) {
    const task = await repositories.tasks.getTaskById({ task_id });
    const task_events = task_id
      ? await repositories.taskEvents.listTaskEventsByTaskId({ task_id, sort: 'asc' })
      : [];
    const latest_checkpoint = task_id
      ? await repositories.checkpoints.getLatestCheckpointByTaskId({ task_id })
      : null;

    return Object.freeze({
      task,
      task_events,
      latest_checkpoint,
    });
  }

  async function collectAuditTrailForLinks({ spawn_request_id = null, approval_request_id = null, child_task_id = null, parent_task_id = null }) {
    return repositories.auditEvents.listAuditEventsByCorrelation({
      related_spawn_request_id: spawn_request_id,
      related_approval_request_id: approval_request_id,
      related_task_id: child_task_id || parent_task_id,
      related_agent_id: null,
      limit: 500,
    });
  }

  return Object.freeze({
    getFixedGovernedDemoScenario() {
      return GOVERNED_DEMO_SCENARIO;
    },

    async runGovernedDemoWalkthrough({
      parent_task_id,
      approve_branch,
      deny_branch,
      actor_context = {},
    }) {
      if (!parent_task_id) {
        throw new Error('runGovernedDemoWalkthrough requires parent_task_id');
      }

      if (!approve_branch || !deny_branch) {
        throw new Error('runGovernedDemoWalkthrough requires approve_branch and deny_branch');
      }

      const scenario = GOVERNED_DEMO_SCENARIO;
      const approveActorContext = buildActorContext({
        actor_context,
        scenario_name: scenario.scenario_name,
        correlation_id: approve_branch.correlation_id,
      });

      const proposeApproved = await spawnProposalService.proposeSpawn({
        parent_task_id,
        agent_template_id: approve_branch.agent_template_id,
        agent_template_version: approve_branch.agent_template_version || null,
        child_task_kind: approve_branch.child_task_kind,
        child_task_scope_json: approve_branch.child_task_scope_json,
        requested_by: approve_branch.requested_by,
        creation_reason: approve_branch.creation_reason,
        justification: approve_branch.justification,
        parent_agent_id: approve_branch.parent_agent_id || null,
        actor_context: approveActorContext,
        spawn_request_id: approve_branch.spawn_request_id,
      });

      const approvedDecision = await spawnApprovalService.approveSpawn({
        approval_request_id: proposeApproved.approval_request.approval_request_id,
        actor_context: approveActorContext,
        decision_reason: approve_branch.decision_reason || 'approved_for_first_governed_demo',
      });

      const instantiated = await spawnInstantiationService.instantiateApprovedSpawn({
        spawn_request_id: approvedDecision.spawn_request.spawn_request_id,
        child_task_id: approve_branch.child_task_id,
        child_agent_id: approve_branch.child_agent_id || null,
        actor_context: approveActorContext,
      });

      const waitingParent = await parentChildCoordinationService.enterParentWaitingForChild({
        spawn_request_id: instantiated.spawn_request.spawn_request_id,
        actor_context: approveActorContext,
        reason: 'first_governed_demo_waiting_for_child',
      });

      const startedChild = await childExecutionService.startChildExecution({
        task_id: instantiated.child_task.task_id,
        lease_owner: approve_branch.lease_owner,
        lease_expires_at: approve_branch.lease_expires_at || null,
        actor_context: approveActorContext,
      });

      const progress = await childExecutionService.recordChildProgress({
        task_id: startedChild.child_task.task_id,
        checkpoint_id: approve_branch.checkpoint_id,
        checkpoint_kind: approve_branch.checkpoint_kind,
        checkpoint_payload_json: approve_branch.checkpoint_payload_json,
        created_by: approve_branch.checkpoint_created_by,
        agent_id: approve_branch.child_agent_id || null,
        actor_context: approveActorContext,
      });

      const completedChild = await childExecutionService.completeChildExecution({
        task_id: startedChild.child_task.task_id,
        result_payload_json: approve_branch.child_result_payload_json,
        actor_context: approveActorContext,
      });

      const merged = await parentChildCoordinationService.mergeCompletedChildResultIntoParent({
        child_task_id: completedChild.child_task.task_id,
        actor_context: approveActorContext,
      });

      const resumed = await parentChildCoordinationService.resumeParentAfterChildMerge({
        parent_task_id: waitingParent.parent_task.task_id,
        actor_context: approveActorContext,
      });

      const denyActorContext = buildActorContext({
        actor_context,
        scenario_name: scenario.scenario_name,
        correlation_id: deny_branch.correlation_id,
      });

      const proposeDenied = await spawnProposalService.proposeSpawn({
        parent_task_id,
        agent_template_id: deny_branch.agent_template_id,
        agent_template_version: deny_branch.agent_template_version || null,
        child_task_kind: deny_branch.child_task_kind,
        child_task_scope_json: deny_branch.child_task_scope_json,
        requested_by: deny_branch.requested_by,
        creation_reason: deny_branch.creation_reason,
        justification: deny_branch.justification,
        parent_agent_id: deny_branch.parent_agent_id || null,
        actor_context: denyActorContext,
        spawn_request_id: deny_branch.spawn_request_id,
      });

      const deniedDecision = await spawnApprovalService.denySpawn({
        approval_request_id: proposeDenied.approval_request.approval_request_id,
        actor_context: denyActorContext,
        decision_reason: deny_branch.decision_reason || 'denied_for_first_governed_demo_branch',
      });

      return Object.freeze({
        scenario,
        approve_branch: Object.freeze({
          proposed: proposeApproved,
          approved: approvedDecision,
          instantiated,
          waiting_parent: waitingParent,
          started_child: startedChild,
          progress,
          completed_child: completedChild,
          merged,
          resumed,
        }),
        deny_branch: Object.freeze({
          proposed: proposeDenied,
          denied: deniedDecision,
        }),
      });
    },

    async collectGovernedDemoProof({
      parent_task_id,
      approved_spawn_request_id,
      approved_approval_request_id,
      child_task_id,
      denied_spawn_request_id,
      denied_approval_request_id,
    }) {
      if (!parent_task_id || !approved_spawn_request_id || !approved_approval_request_id || !child_task_id || !denied_spawn_request_id || !denied_approval_request_id) {
        throw new Error('collectGovernedDemoProof requires parent_task_id, approved/denied spawn and approval ids, and child_task_id');
      }

      const parent_snapshot = await collectTaskSnapshot(parent_task_id);
      const child_snapshot = await collectTaskSnapshot(child_task_id);

      const approved_spawn_request = await repositories.spawnRequests.getSpawnRequestById({
        spawn_request_id: approved_spawn_request_id,
      });

      const approved_approval_request = await repositories.approvalRequests.getApprovalRequestById({
        approval_request_id: approved_approval_request_id,
      });

      const denied_spawn_request = await repositories.spawnRequests.getSpawnRequestById({
        spawn_request_id: denied_spawn_request_id,
      });

      const denied_approval_request = await repositories.approvalRequests.getApprovalRequestById({
        approval_request_id: denied_approval_request_id,
      });

      const approved_audit_trail = await collectAuditTrailForLinks({
        spawn_request_id: approved_spawn_request_id,
        approval_request_id: approved_approval_request_id,
        child_task_id,
        parent_task_id,
      });

      const denied_audit_trail = await collectAuditTrailForLinks({
        spawn_request_id: denied_spawn_request_id,
        approval_request_id: denied_approval_request_id,
        parent_task_id,
      });

      return Object.freeze({
        scenario: GOVERNED_DEMO_SCENARIO,
        parent_snapshot,
        child_snapshot,
        approved_branch: Object.freeze({
          spawn_request: approved_spawn_request,
          approval_request: approved_approval_request,
          audit_trail: approved_audit_trail,
        }),
        denied_branch: Object.freeze({
          spawn_request: denied_spawn_request,
          approval_request: denied_approval_request,
          audit_trail: denied_audit_trail,
        }),
        proof_summary: Object.freeze({
          required_event_types: GOVERNED_DEMO_SCENARIO.proof_requirements,
          merged_child_result_present: Boolean(
            parent_snapshot.task
            && parent_snapshot.task.result_payload_json
            && parent_snapshot.task.result_payload_json.merged_child_result
          ),
          parent_resumed_to_ready: Boolean(
            parent_snapshot.task
            && parent_snapshot.task.status === 'ready'
            && parent_snapshot.task.wait_reason == null
            && parent_snapshot.task.blocked_on_spawn_request_id == null
            && parent_snapshot.task.blocked_on_task_id == null
          ),
          child_completed: Boolean(
            child_snapshot.task
            && child_snapshot.task.status === 'completed'
          ),
          checkpoint_recorded: Boolean(child_snapshot.latest_checkpoint),
          deny_branch_terminal: Boolean(
            denied_spawn_request
            && denied_spawn_request.status === 'denied'
            && denied_approval_request
            && denied_approval_request.status === 'denied'
          ),
        }),
      });
    },
  });
}

module.exports = {
  GOVERNED_DEMO_SCENARIO,
  GOVERNED_DEMO_PACKAGING_SERVICE_CONTRACT,
  createGovernedDemoPackagingService,
};
