// V1 control-plane spawn instantiation service.
// This module realizes only the bounded child instantiation path.
// No child execution, waiting_for_child behavior, merge-back behavior,
// executor integration, API wiring, or runtime builder authority belongs here.

const { TASK_STATES } = require('../types/taskStates');
const { AGENT_STATES } = require('../types/agentStates');
const { APPROVAL_STATES } = require('../types/approvalStates');
const { SPAWN_REQUEST_STATES } = require('../types/spawnRequestStates');
const { AUDIT_EVENT_TYPES } = require('../types/auditEventTypes');
const { TRANSITION_GUARD_CONTRACT } = require('../domain/transitionGuards');
const { AUDIT_BACKBONE_CONTRACT } = require('../domain/auditBackbone');
const { createTaskflowChildLinkageService } = require('./taskflowChildLinkageService');

const SPAWN_INSTANTIATION_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'spawnInstantiationService',
    service_role: 'bounded_child_instantiation_mediator',
    ownership_rule: 'The service layer is the only allowed mediator of governed child instantiation in v1.',
    forbidden_direct_mutators: Object.freeze([
      'repositories',
      'routes',
      'helper_chains',
      'runtime_builders',
      'ad_hoc_call_sites',
    ]),
  }),

  implemented_methods: Object.freeze([
    'instantiateApprovedSpawn',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'child execution loop',
    'checkpoints/heartbeats runtime handling',
    'parent waiting_for_child behavior',
    'merge_back behavior',
    'parent resume behavior',
    'executor loop integration',
    'API/runtime wiring',
  ]),
});

function createSpawnInstantiationService({ repositories, openClawDelegationAdapterService = null, taskflowChildLinkageService = createTaskflowChildLinkageService(), transitionGuardContract = TRANSITION_GUARD_CONTRACT } = {}) {
  if (!repositories || !repositories.spawnRequests || !repositories.approvalRequests || !repositories.tasks || !repositories.agentTemplates || !repositories.auditEvents || !repositories.agentRegistry) {
    throw new Error('spawnInstantiationService requires repositories.spawnRequests, repositories.approvalRequests, repositories.tasks, repositories.agentTemplates, repositories.agentRegistry, and repositories.auditEvents');
  }

  if (openClawDelegationAdapterService) {
    const hasAdapterShape = typeof openClawDelegationAdapterService.buildDelegationPlan === 'function'
      && typeof openClawDelegationAdapterService.materializeDelegatedChildPayload === 'function'
      && typeof openClawDelegationAdapterService.buildChildCompletionPayload === 'function';

    if (!hasAdapterShape) {
      throw new Error('spawnInstantiationService openClawDelegationAdapterService must expose delegation planning and completion payload methods');
    }
  }

  const spawnRequestTransitions = transitionGuardContract.spawn_request_state_transitions || {};

  function ensureAllowedSpawnRequestTransition(fromState, toState) {
    const allowedNextStates = spawnRequestTransitions[fromState] || [];
    if (!allowedNextStates.includes(toState)) {
      throw new Error(`Illegal spawn_request transition: ${fromState} -> ${toState}`);
    }
  }

  function buildAuditEvent({
    eventType,
    entityType,
    entityId,
    rootTaskId,
    relatedTaskId = null,
    relatedAgentId = null,
    relatedSpawnRequestId = null,
    relatedApprovalRequestId = null,
    actorContext = {},
    correlationId,
    payloadSummary = {},
    occurredAt,
  }) {
    const requiredMetadata = AUDIT_BACKBONE_CONTRACT.metadata_contract.required_metadata;
    const auditEvent = {
      audit_event_id: `${entityId}:${eventType}:${Date.now()}`,
      event_type: eventType,
      occurred_at: occurredAt || new Date().toISOString(),
      entity_type: entityType,
      entity_id: entityId,
      root_task_id: rootTaskId,
      related_task_id: relatedTaskId,
      related_agent_id: relatedAgentId,
      related_spawn_request_id: relatedSpawnRequestId,
      related_approval_request_id: relatedApprovalRequestId,
      actor_type: actorContext.actor_type || 'system',
      actor_id: actorContext.actor_id || 'spawnInstantiationService',
      correlation_id: correlationId || rootTaskId,
      payload_summary: payloadSummary,
      payload_ref: null,
      payload_detail_intent: 'bounded_child_instantiation_summary',
      append_only: true,
    };

    for (const fieldName of requiredMetadata) {
      if (auditEvent[fieldName] === undefined) {
        throw new Error(`Missing required audit metadata field: ${fieldName}`);
      }
    }

    return auditEvent;
  }

  async function loadApprovedSpawnOrThrow({ spawn_request_id }) {
    if (!spawn_request_id) {
      throw new Error('instantiateApprovedSpawn requires spawn_request_id');
    }

    const spawnRequest = await repositories.spawnRequests.getSpawnRequestById({ spawn_request_id });
    if (!spawnRequest) {
      throw new Error(`Spawn request not found: ${spawn_request_id}`);
    }

    if (spawnRequest.status === SPAWN_REQUEST_STATES.INSTANTIATING || spawnRequest.status === SPAWN_REQUEST_STATES.INSTANTIATED) {
      throw new Error(`Spawn request already being instantiated or already instantiated: ${spawn_request_id}`);
    }

    if (spawnRequest.status !== SPAWN_REQUEST_STATES.APPROVED) {
      throw new Error(`Spawn request is not approved: ${spawn_request_id}`);
    }

    if (spawnRequest.instantiated_task_id || spawnRequest.instantiated_agent_id) {
      throw new Error(`Approved spawn_request already has instantiated child linkage: ${spawn_request_id}`);
    }

    if (!spawnRequest.approval_request_id) {
      throw new Error(`Approved spawn_request is missing approval_request_id: ${spawn_request_id}`);
    }

    const approvalRequest = await repositories.approvalRequests.getApprovalRequestById({
      approval_request_id: spawnRequest.approval_request_id,
    });

    if (!approvalRequest) {
      throw new Error(`Linked approval_request not found for spawn_request: ${spawn_request_id}`);
    }

    if (approvalRequest.approval_kind !== 'spawn_request') {
      throw new Error(`Unsupported approval_kind for child instantiation: ${approvalRequest.approval_kind}`);
    }

    if (approvalRequest.status !== APPROVAL_STATES.APPROVED) {
      throw new Error(`Linked approval_request is not approved: ${approvalRequest.approval_request_id}`);
    }

    if (approvalRequest.target_id !== spawnRequest.spawn_request_id) {
      throw new Error(`approval_request target mismatch for spawn_request: ${spawn_request_id}`);
    }

    const template = await repositories.agentTemplates.getAgentTemplateByIdAndVersion({
      agent_template_id: spawnRequest.agent_template_id,
      version: spawnRequest.agent_template_version,
    });

    if (!template) {
      throw new Error(`Approved template not found for spawn_request: ${spawn_request_id}`);
    }

    if (!template.enabled) {
      throw new Error(`Template is not enabled: ${template.agent_template_id}`);
    }

    return Object.freeze({
      spawnRequest,
      approvalRequest,
      template,
    });
  }

  return Object.freeze({
    async instantiateApprovedSpawn({
      spawn_request_id,
      child_task_id,
      child_agent_id,
      actor_context = {},
    }) {
      if (!child_task_id) {
        throw new Error('instantiateApprovedSpawn requires child_task_id');
      }

      const { spawnRequest, approvalRequest, template } = await loadApprovedSpawnOrThrow({ spawn_request_id });

      ensureAllowedSpawnRequestTransition(spawnRequest.status, SPAWN_REQUEST_STATES.INSTANTIATING);

      const instantiationStartedAt = new Date().toISOString();

      const instantiatingSpawnRequest = await repositories.spawnRequests.updateSpawnRequestById({
        spawn_request_id: spawnRequest.spawn_request_id,
        patch: {
          status: SPAWN_REQUEST_STATES.INSTANTIATING,
          updated_at: instantiationStartedAt,
        },
      });

      if (!instantiatingSpawnRequest) {
        throw new Error(`Failed to transition spawn_request to instantiating: ${spawnRequest.spawn_request_id}`);
      }

      if (instantiatingSpawnRequest.status !== SPAWN_REQUEST_STATES.INSTANTIATING) {
        throw new Error(`Failed to acquire instantiation ownership for spawn_request: ${spawnRequest.spawn_request_id}`);
      }

      if (instantiatingSpawnRequest.instantiated_task_id || instantiatingSpawnRequest.instantiated_agent_id) {
        throw new Error(`Spawn request already instantiated while acquiring instantiation ownership: ${spawnRequest.spawn_request_id}`);
      }

      await repositories.auditEvents.appendAuditEvent({
        audit_event: buildAuditEvent({
          eventType: AUDIT_EVENT_TYPES.CHILD_INSTANTIATION_STARTED,
          entityType: 'spawn_request',
          entityId: instantiatingSpawnRequest.spawn_request_id,
          rootTaskId: instantiatingSpawnRequest.root_task_id,
          relatedTaskId: instantiatingSpawnRequest.parent_task_id,
          relatedSpawnRequestId: instantiatingSpawnRequest.spawn_request_id,
          relatedApprovalRequestId: approvalRequest.approval_request_id,
          actorContext: actor_context,
          correlationId: actor_context.correlation_id || instantiatingSpawnRequest.root_task_id || instantiatingSpawnRequest.parent_task_id,
          payloadSummary: {
            status: instantiatingSpawnRequest.status,
            child_task_id,
            child_agent_id: child_agent_id || null,
            agent_template_id: template.agent_template_id,
            agent_template_version: template.version,
          },
          occurredAt: instantiationStartedAt,
        }),
      });

      const parentTask = await repositories.tasks.getTaskById({ task_id: spawnRequest.parent_task_id });
      if (!parentTask) {
        throw new Error(`Parent task not found for approved spawn_request: ${spawn_request_id}`);
      }

      const delegatedExecutionPayload = openClawDelegationAdapterService
        ? openClawDelegationAdapterService.materializeDelegatedChildPayload({
            parent_task: parentTask,
            child_task: {
              task_id: child_task_id,
              task_kind: instantiatingSpawnRequest.child_task_kind,
              task_scope_json: instantiatingSpawnRequest.child_task_scope_json,
            },
            spawn_request: instantiatingSpawnRequest,
            template,
          })
        : null;

      const taskflowChildLinkage = taskflowChildLinkageService.buildChildLinkage({
        parent_task: parentTask,
        spawn_request: instantiatingSpawnRequest,
        approval_request: approvalRequest,
        child_task: {
          task_id: child_task_id,
          task_kind: instantiatingSpawnRequest.child_task_kind,
        },
        openclaw_delegation: delegatedExecutionPayload,
      });

      const childTask = await repositories.tasks.createTask({
        task: {
          task_id: child_task_id,
          root_task_id: instantiatingSpawnRequest.root_task_id,
          parent_task_id: spawnRequest.parent_task_id,
          created_by_agent_id: instantiatingSpawnRequest.parent_agent_id || null,
          assigned_agent_id: child_agent_id || null,
          task_kind: instantiatingSpawnRequest.child_task_kind,
          status: TASK_STATES.CREATED,
          priority: 0,
          task_scope_json: instantiatingSpawnRequest.child_task_scope_json,
          input_payload_json: {
            spawned_by_spawn_request_id: instantiatingSpawnRequest.spawn_request_id,
            approved_by_approval_request_id: approvalRequest.approval_request_id,
            creation_reason: instantiatingSpawnRequest.creation_reason,
            justification: instantiatingSpawnRequest.justification,
            execution_substrate: delegatedExecutionPayload ? delegatedExecutionPayload.execution_substrate : 'custom_child_runtime',
            openclaw_delegation: delegatedExecutionPayload,
            taskflow_child_linkage: taskflowChildLinkage,
          },
          spawn_depth: 1,
          active_child_count: 0,
          spawn_budget_used: 0,
          spawn_budget_limit: 0,
          retry_count: 0,
          max_retries: 0,
          checkpoint_seq: 0,
          blocked_on_spawn_request_id: instantiatingSpawnRequest.spawn_request_id,
          created_at: instantiationStartedAt,
          updated_at: instantiationStartedAt,
        },
      });

      let childAgent = null;
      if (child_agent_id) {
        childAgent = await repositories.agentRegistry.createAgent({
          agent: {
            agent_id: child_agent_id,
            agent_class: template.agent_class,
            agent_template_id: template.agent_template_id,
            agent_template_version: template.version,
            agent_kind: template.agent_kind,
            spawned_by_spawn_request_id: instantiatingSpawnRequest.spawn_request_id,
            root_task_id: instantiatingSpawnRequest.root_task_id,
            task_scope_json: instantiatingSpawnRequest.child_task_scope_json,
            capabilities_json: template.capabilities_json,
            policy_boundary_class: template.policy_boundary_class,
            status: AGENT_STATES.READY,
            approval_state: APPROVAL_STATES.APPROVED,
            spawn_depth: 1,
            child_count: 0,
            ttl_seconds: template.ttl_seconds,
            creation_reason: instantiatingSpawnRequest.creation_reason,
            created_at: instantiationStartedAt,
            updated_at: instantiationStartedAt,
            parent_agent_id: instantiatingSpawnRequest.parent_agent_id || null,
            spawned_by_task_id: childTask.task_id,
            current_task_id: childTask.task_id,
          },
        });
      }

      ensureAllowedSpawnRequestTransition(SPAWN_REQUEST_STATES.INSTANTIATING, SPAWN_REQUEST_STATES.INSTANTIATED);

      const instantiatedAt = new Date().toISOString();
      const instantiatedSpawnRequest = await repositories.spawnRequests.updateSpawnRequestById({
        spawn_request_id: instantiatingSpawnRequest.spawn_request_id,
        patch: {
          status: SPAWN_REQUEST_STATES.INSTANTIATED,
          instantiated_task_id: childTask.task_id,
          instantiated_agent_id: childAgent ? childAgent.agent_id : null,
          updated_at: instantiatedAt,
        },
      });

      if (!instantiatedSpawnRequest) {
        throw new Error(`Failed to transition spawn_request to instantiated: ${instantiatingSpawnRequest.spawn_request_id}`);
      }

      await repositories.auditEvents.appendAuditEvent({
        audit_event: buildAuditEvent({
          eventType: AUDIT_EVENT_TYPES.CHILD_INSTANTIATED,
          entityType: 'spawn_request',
          entityId: instantiatedSpawnRequest.spawn_request_id,
          rootTaskId: instantiatedSpawnRequest.root_task_id,
          relatedTaskId: childTask.task_id,
          relatedAgentId: childAgent ? childAgent.agent_id : null,
          relatedSpawnRequestId: instantiatedSpawnRequest.spawn_request_id,
          relatedApprovalRequestId: approvalRequest.approval_request_id,
          actorContext: actor_context,
          correlationId: actor_context.correlation_id || instantiatedSpawnRequest.root_task_id || instantiatedSpawnRequest.parent_task_id,
          payloadSummary: {
            status: instantiatedSpawnRequest.status,
            instantiated_task_id: childTask.task_id,
            instantiated_agent_id: childAgent ? childAgent.agent_id : null,
            parent_task_id: instantiatedSpawnRequest.parent_task_id,
            root_task_id: instantiatedSpawnRequest.root_task_id,
            taskflow_child_linkage_flow_id: childTask.input_payload_json && childTask.input_payload_json.taskflow_child_linkage
              ? childTask.input_payload_json.taskflow_child_linkage.flow_id
              : null,
          },
          occurredAt: instantiatedAt,
        }),
      });

      return Object.freeze({
        spawn_request: instantiatedSpawnRequest,
        approval_request: approvalRequest,
        child_task: childTask,
        child_agent: childAgent,
      });
    },
  });
}

module.exports = {
  SPAWN_INSTANTIATION_SERVICE_CONTRACT,
  createSpawnInstantiationService,
};
