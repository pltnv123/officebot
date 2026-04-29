// V1 control-plane spawn approval service.
// This module realizes only the bounded approve_spawn and deny_spawn paths.
// No child instantiation, child execution, merge-back behavior,
// executor integration, API wiring, or runtime builder authority belongs here.

const { APPROVAL_STATES } = require('../types/approvalStates');
const { SPAWN_REQUEST_STATES } = require('../types/spawnRequestStates');
const { AUDIT_EVENT_TYPES } = require('../types/auditEventTypes');
const { TRANSITION_GUARD_CONTRACT } = require('../domain/transitionGuards');
const { AUDIT_BACKBONE_CONTRACT } = require('../domain/auditBackbone');

const SPAWN_APPROVAL_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'spawnApprovalService',
    service_role: 'bounded_spawn_approval_mediator',
    ownership_rule: 'The service layer is the only allowed mediator of governed spawn approval in v1.',
    forbidden_direct_mutators: Object.freeze([
      'repositories',
      'routes',
      'helper_chains',
      'runtime_builders',
      'ad_hoc_call_sites',
    ]),
  }),

  implemented_methods: Object.freeze([
    'approveSpawn',
    'denySpawn',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'child instantiation',
    'child task creation as runtime behavior',
    'child agent creation',
    'waiting_for_child behavior',
    'merge_back behavior',
    'executor loop integration',
    'API/runtime wiring',
  ]),
});

function createSpawnApprovalService({ repositories, taskLifecycleService = null, transitionGuardContract = TRANSITION_GUARD_CONTRACT } = {}) {
  if (!repositories || !repositories.approvalRequests || !repositories.spawnRequests || !repositories.auditEvents) {
    throw new Error('spawnApprovalService requires repositories.approvalRequests, repositories.spawnRequests, and repositories.auditEvents');
  }

  if (taskLifecycleService) {
    const hasLifecycleShape = typeof taskLifecycleService.resumeTask === 'function';
    if (!hasLifecycleShape) {
      throw new Error('spawnApprovalService taskLifecycleService must expose resumeTask when provided');
    }
  }

  const approvalStateTransitions = transitionGuardContract.approval_state_transitions || {};
  const spawnRequestTransitions = transitionGuardContract.spawn_request_state_transitions || {};

  function ensureAllowedApprovalTransition(fromState, toState) {
    const allowedNextStates = approvalStateTransitions[fromState] || [];
    if (!allowedNextStates.includes(toState)) {
      throw new Error(`Illegal approval_request transition: ${fromState} -> ${toState}`);
    }
  }

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
      actor_id: actorContext.actor_id || 'spawnApprovalService',
      correlation_id: correlationId || rootTaskId,
      payload_summary: payloadSummary,
      payload_ref: null,
      payload_detail_intent: 'bounded_spawn_approval_summary',
      append_only: true,
    };

    for (const fieldName of requiredMetadata) {
      if (auditEvent[fieldName] === undefined) {
        throw new Error(`Missing required audit metadata field: ${fieldName}`);
      }
    }

    return auditEvent;
  }

  async function loadAndValidatePendingSpawnApprovalTarget({ approval_request_id, operationName }) {
    if (!approval_request_id) {
      throw new Error(`${operationName} requires approval_request_id`);
    }

    const approvalRequest = await repositories.approvalRequests.getApprovalRequestById({ approval_request_id });
    if (!approvalRequest) {
      throw new Error(`Approval request not found: ${approval_request_id}`);
    }

    if (approvalRequest.approval_kind !== 'spawn_request') {
      throw new Error(`Unsupported approval_kind for ${operationName}: ${approvalRequest.approval_kind}`);
    }

    if (approvalRequest.status !== APPROVAL_STATES.PENDING) {
      throw new Error(`Approval request is not pending: ${approval_request_id}`);
    }

    if (!approvalRequest.target_id) {
      throw new Error(`approval_request.target_id is required for ${operationName}: ${approval_request_id}`);
    }

    const targetSpawnRequest = await repositories.spawnRequests.getSpawnRequestById({
      spawn_request_id: approvalRequest.target_id,
    });

    if (!targetSpawnRequest) {
      throw new Error(`Target spawn_request not found for approval_request: ${approval_request_id}`);
    }

    const linkedSpawnRequest = await repositories.spawnRequests.getSpawnRequestByApprovalRequestId({
      approval_request_id: approvalRequest.approval_request_id,
    });

    if (!linkedSpawnRequest) {
      throw new Error(`Linked spawn_request not found for approval_request: ${approval_request_id}`);
    }

    if (linkedSpawnRequest.spawn_request_id !== approvalRequest.target_id) {
      throw new Error(`approval_request target mismatch for spawn_request: ${approval_request_id}`);
    }

    if (linkedSpawnRequest.approval_request_id !== approvalRequest.approval_request_id) {
      throw new Error(`spawn_request linkage mismatch for approval_request: ${approval_request_id}`);
    }

    if (targetSpawnRequest.spawn_request_id !== linkedSpawnRequest.spawn_request_id) {
      throw new Error(`target spawn_request does not match linked spawn_request: ${approval_request_id}`);
    }

    if (targetSpawnRequest.status === SPAWN_REQUEST_STATES.DUPLICATE_SUPPRESSED) {
      throw new Error(`Duplicate-suppressed spawn_request may not be resolved through approval: ${targetSpawnRequest.spawn_request_id}`);
    }

    if (targetSpawnRequest.status !== SPAWN_REQUEST_STATES.AWAITING_APPROVAL) {
      throw new Error(`Spawn request is not awaiting approval: ${targetSpawnRequest.spawn_request_id}`);
    }

    return Object.freeze({
      approvalRequest,
      spawnRequest: targetSpawnRequest,
    });
  }

  return Object.freeze({
    async approveSpawn({ approval_request_id, actor_context = {}, decision_reason = null }) {
      const { approvalRequest, spawnRequest } = await loadAndValidatePendingSpawnApprovalTarget({
        approval_request_id,
        operationName: 'approveSpawn',
      });

      ensureAllowedApprovalTransition(approvalRequest.status, APPROVAL_STATES.APPROVED);
      ensureAllowedSpawnRequestTransition(spawnRequest.status, SPAWN_REQUEST_STATES.APPROVED);

      const decidedAt = new Date().toISOString();

      const approvedApprovalRequest = await repositories.approvalRequests.updateApprovalRequestById({
        approval_request_id: approvalRequest.approval_request_id,
        patch: {
          status: APPROVAL_STATES.APPROVED,
          decision_at: decidedAt,
          decision_by: actor_context.actor_id || 'spawnApprovalService',
          decision_reason: decision_reason,
        },
      });

      if (!approvedApprovalRequest) {
        throw new Error(`Failed to approve approval_request: ${approval_request_id}`);
      }

      const approvedSpawnRequest = await repositories.spawnRequests.updateSpawnRequestById({
        spawn_request_id: spawnRequest.spawn_request_id,
        patch: {
          status: SPAWN_REQUEST_STATES.APPROVED,
          approved_at: decidedAt,
          approved_by: actor_context.actor_id || 'spawnApprovalService',
          updated_at: decidedAt,
        },
      });

      if (!approvedSpawnRequest) {
        throw new Error(`Failed to approve spawn_request: ${spawnRequest.spawn_request_id}`);
      }

      await repositories.auditEvents.appendAuditEvent({
        audit_event: buildAuditEvent({
          eventType: AUDIT_EVENT_TYPES.APPROVAL_REQUEST_APPROVED,
          entityType: 'approval_request',
          entityId: approvedApprovalRequest.approval_request_id,
          rootTaskId: approvedSpawnRequest.root_task_id,
          relatedTaskId: approvedSpawnRequest.parent_task_id,
          relatedSpawnRequestId: approvedSpawnRequest.spawn_request_id,
          relatedApprovalRequestId: approvedApprovalRequest.approval_request_id,
          actorContext: actor_context,
          correlationId: actor_context.correlation_id || approvedSpawnRequest.root_task_id || approvedSpawnRequest.parent_task_id,
          payloadSummary: {
            approval_kind: approvedApprovalRequest.approval_kind,
            target_id: approvedApprovalRequest.target_id,
            status: approvedApprovalRequest.status,
            decision_reason: approvedApprovalRequest.decision_reason || null,
          },
          occurredAt: decidedAt,
        }),
      });

      await repositories.auditEvents.appendAuditEvent({
        audit_event: buildAuditEvent({
          eventType: AUDIT_EVENT_TYPES.SPAWN_APPROVED,
          entityType: 'spawn_request',
          entityId: approvedSpawnRequest.spawn_request_id,
          rootTaskId: approvedSpawnRequest.root_task_id,
          relatedTaskId: approvedSpawnRequest.parent_task_id,
          relatedSpawnRequestId: approvedSpawnRequest.spawn_request_id,
          relatedApprovalRequestId: approvedApprovalRequest.approval_request_id,
          actorContext: actor_context,
          correlationId: actor_context.correlation_id || approvedSpawnRequest.root_task_id || approvedSpawnRequest.parent_task_id,
          payloadSummary: {
            status: approvedSpawnRequest.status,
            approval_request_id: approvedApprovalRequest.approval_request_id,
            approved_by: approvedSpawnRequest.approved_by || null,
          },
          occurredAt: decidedAt,
        }),
      });

      if (taskLifecycleService) {
        const parentTask = await repositories.tasks.getTaskById({ task_id: approvedSpawnRequest.parent_task_id });
        if (parentTask && parentTask.status === 'waiting_for_approval' && parentTask.blocked_on_approval_request_id === approvedApprovalRequest.approval_request_id) {
          await taskLifecycleService.resumeTask({
            task_id: parentTask.task_id,
            actor_context: {
              ...actor_context,
              bounded_resume_reason: 'parent_resumed_after_spawn_approval',
            },
            reason: 'parent_resumed_after_spawn_approval',
          });
        }
      }

      return Object.freeze({
        approval_request: approvedApprovalRequest,
        spawn_request: approvedSpawnRequest,
      });
    },

    async denySpawn({ approval_request_id, actor_context = {}, decision_reason = null }) {
      const { approvalRequest, spawnRequest } = await loadAndValidatePendingSpawnApprovalTarget({
        approval_request_id,
        operationName: 'denySpawn',
      });

      ensureAllowedApprovalTransition(approvalRequest.status, APPROVAL_STATES.DENIED);
      ensureAllowedSpawnRequestTransition(spawnRequest.status, SPAWN_REQUEST_STATES.DENIED);

      const decidedAt = new Date().toISOString();

      const deniedApprovalRequest = await repositories.approvalRequests.updateApprovalRequestById({
        approval_request_id: approvalRequest.approval_request_id,
        patch: {
          status: APPROVAL_STATES.DENIED,
          decision_at: decidedAt,
          decision_by: actor_context.actor_id || 'spawnApprovalService',
          decision_reason: decision_reason,
        },
      });

      if (!deniedApprovalRequest) {
        throw new Error(`Failed to deny approval_request: ${approval_request_id}`);
      }

      const deniedSpawnRequest = await repositories.spawnRequests.updateSpawnRequestById({
        spawn_request_id: spawnRequest.spawn_request_id,
        patch: {
          status: SPAWN_REQUEST_STATES.DENIED,
          denied_at: decidedAt,
          denied_by: actor_context.actor_id || 'spawnApprovalService',
          deny_reason: decision_reason,
          updated_at: decidedAt,
        },
      });

      if (!deniedSpawnRequest) {
        throw new Error(`Failed to deny spawn_request: ${spawnRequest.spawn_request_id}`);
      }

      await repositories.auditEvents.appendAuditEvent({
        audit_event: buildAuditEvent({
          eventType: AUDIT_EVENT_TYPES.APPROVAL_REQUEST_DENIED,
          entityType: 'approval_request',
          entityId: deniedApprovalRequest.approval_request_id,
          rootTaskId: deniedSpawnRequest.root_task_id,
          relatedTaskId: deniedSpawnRequest.parent_task_id,
          relatedSpawnRequestId: deniedSpawnRequest.spawn_request_id,
          relatedApprovalRequestId: deniedApprovalRequest.approval_request_id,
          actorContext: actor_context,
          correlationId: actor_context.correlation_id || deniedSpawnRequest.root_task_id || deniedSpawnRequest.parent_task_id,
          payloadSummary: {
            approval_kind: deniedApprovalRequest.approval_kind,
            target_id: deniedApprovalRequest.target_id,
            status: deniedApprovalRequest.status,
            decision_reason: deniedApprovalRequest.decision_reason || null,
          },
          occurredAt: decidedAt,
        }),
      });

      await repositories.auditEvents.appendAuditEvent({
        audit_event: buildAuditEvent({
          eventType: AUDIT_EVENT_TYPES.SPAWN_DENIED,
          entityType: 'spawn_request',
          entityId: deniedSpawnRequest.spawn_request_id,
          rootTaskId: deniedSpawnRequest.root_task_id,
          relatedTaskId: deniedSpawnRequest.parent_task_id,
          relatedSpawnRequestId: deniedSpawnRequest.spawn_request_id,
          relatedApprovalRequestId: deniedApprovalRequest.approval_request_id,
          actorContext: actor_context,
          correlationId: actor_context.correlation_id || deniedSpawnRequest.root_task_id || deniedSpawnRequest.parent_task_id,
          payloadSummary: {
            status: deniedSpawnRequest.status,
            approval_request_id: deniedApprovalRequest.approval_request_id,
            denied_by: deniedSpawnRequest.denied_by || null,
            deny_reason: deniedSpawnRequest.deny_reason || null,
          },
          occurredAt: decidedAt,
        }),
      });

      return Object.freeze({
        approval_request: deniedApprovalRequest,
        spawn_request: deniedSpawnRequest,
      });
    },
  });
}

module.exports = {
  SPAWN_APPROVAL_SERVICE_CONTRACT,
  createSpawnApprovalService,
};
