// V1 control-plane spawn proposal service.
// This module realizes only the bounded propose_spawn path.
// No approval request creation, approval decision behavior, child instantiation,
// child execution, merge-back behavior, executor integration, API wiring,
// or runtime builder authority belongs here.

const crypto = require('crypto');

const { SPAWN_REQUEST_STATES } = require('../types/spawnRequestStates');
const { APPROVAL_STATES } = require('../types/approvalStates');
const { AUDIT_EVENT_TYPES } = require('../types/auditEventTypes');
const { SPAWN_INTENT_HASH_RECIPE_VERSION } = require('../domain/spawnIntentHash');
const { TRANSITION_GUARD_CONTRACT } = require('../domain/transitionGuards');
const { AUDIT_BACKBONE_CONTRACT } = require('../domain/auditBackbone');

const SPAWN_PROPOSAL_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'spawnProposalService',
    service_role: 'bounded_spawn_proposal_mediator',
    ownership_rule: 'The service layer is the only allowed mediator of governed spawn proposal creation and duplicate suppression in v1.',
    forbidden_direct_mutators: Object.freeze([
      'repositories',
      'routes',
      'helper_chains',
      'runtime_builders',
      'ad_hoc_call_sites',
    ]),
  }),

  implemented_methods: Object.freeze([
    'proposeSpawn',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'approve_spawn',
    'deny_spawn',
    'child instantiation',
    'child task creation as runtime behavior',
    'child agent creation',
    'waiting_for_child behavior',
    'merge_back behavior',
    'executor loop integration',
    'API/runtime wiring',
  ]),
});

function createSpawnProposalService({ repositories, taskLifecycleService, transitionGuardContract = TRANSITION_GUARD_CONTRACT } = {}) {
  if (!repositories || !repositories.tasks || !repositories.spawnRequests || !repositories.approvalRequests || !repositories.agentTemplates || !repositories.auditEvents) {
    throw new Error('spawnProposalService requires repositories.tasks, repositories.spawnRequests, repositories.approvalRequests, repositories.agentTemplates, and repositories.auditEvents');
  }

  if (!taskLifecycleService || typeof taskLifecycleService.waitForApproval !== 'function') {
    throw new Error('spawnProposalService requires taskLifecycleService.waitForApproval');
  }

  const spawnRequestTransitions = transitionGuardContract.spawn_request_state_transitions || {};
  const approvalStateTransitions = transitionGuardContract.approval_state_transitions || {};
  const denyRules = transitionGuardContract.v1_deny_rules || {};

  function normalizeString(value) {
    return String(value ?? '').normalize('NFC').trim();
  }

  function canonicalizeJson(value) {
    if (Array.isArray(value)) {
      return value.map(canonicalizeJson);
    }

    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = canonicalizeJson(value[key]);
          return acc;
        }, {});
    }

    if (typeof value === 'string') {
      return value.normalize('NFC');
    }

    return value;
  }

  function computeSpawnIntentHash({ parent_task_id, agent_template_id, child_task_kind, child_task_scope_json, creation_reason }) {
    const canonicalPayload = {
      recipe_version: SPAWN_INTENT_HASH_RECIPE_VERSION,
      parent_task_id: normalizeString(parent_task_id),
      agent_template_id: normalizeString(agent_template_id),
      child_task_kind: normalizeString(child_task_kind),
      child_task_scope_json: canonicalizeJson(child_task_scope_json),
      creation_reason: normalizeString(creation_reason),
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(canonicalPayload))
      .digest('hex');
  }

  function ensureAllowedSpawnRequestTransition(fromState, toState) {
    const allowedNextStates = spawnRequestTransitions[fromState] || [];
    if (!allowedNextStates.includes(toState)) {
      throw new Error(`Illegal spawn_request transition: ${fromState} -> ${toState}`);
    }
  }

  async function loadParentTaskOrThrow(parentTaskId) {
    const parentTask = await repositories.tasks.getTaskById({ task_id: parentTaskId });
    if (!parentTask) {
      throw new Error(`Parent task not found: ${parentTaskId}`);
    }
    return parentTask;
  }

  async function loadApprovedTemplateOrThrow(agentTemplateId, agentTemplateVersion = null) {
    const template = agentTemplateVersion
      ? await repositories.agentTemplates.getAgentTemplateByIdAndVersion({
          agent_template_id: agentTemplateId,
          version: agentTemplateVersion,
        })
      : await repositories.agentTemplates.getAgentTemplateById({
          agent_template_id: agentTemplateId,
        });

    if (!template) {
      throw new Error(`Approved template not found: ${agentTemplateId}`);
    }

    return template;
  }

  function enforceProposalPolicyBounds({ parentTask, template, childTaskKind }) {
    if (!template.enabled) {
      throw new Error(`Template is not enabled: ${template.agent_template_id}`);
    }

    if (template.agent_kind !== 'ephemeral_child') {
      throw new Error(`Template agent_kind is not allowed in v1: ${template.agent_kind}`);
    }

    if (!Array.isArray(template.allowed_task_kinds_json) || !template.allowed_task_kinds_json.includes(childTaskKind)) {
      throw new Error(`Template does not allow child_task_kind: ${childTaskKind}`);
    }

    if (template.spawn_requires_approval !== true) {
      throw new Error('Spawn proposal must require approval in v1');
    }

    if ((parentTask.spawn_depth ?? 0) >= (denyRules.recursion_depth_cap?.max_depth ?? 1)) {
      throw new Error('Spawn depth cap exceeded for v1');
    }

    if ((parentTask.active_child_count ?? 0) >= (denyRules.max_active_child_count?.max_count ?? 1)) {
      throw new Error('Parent task already has max active child count in v1');
    }

    if ((template.max_recursion_depth ?? 1) !== 1) {
      throw new Error(`Template max_recursion_depth is outside v1 bound: ${template.max_recursion_depth}`);
    }

    if ((template.max_active_children_per_parent ?? 1) !== 1) {
      throw new Error(`Template max_active_children_per_parent is outside v1 bound: ${template.max_active_children_per_parent}`);
    }
  }

  function buildAuditEvent({ eventType, parentTask, spawnRequest, actorContext = {}, payloadSummary = {} }) {
    const requiredMetadata = AUDIT_BACKBONE_CONTRACT.metadata_contract.required_metadata;
    const auditEvent = {
      audit_event_id: `${spawnRequest.spawn_request_id}:${eventType}:${Date.now()}`,
      event_type: eventType,
      occurred_at: new Date().toISOString(),
      entity_type: 'spawn_request',
      entity_id: spawnRequest.spawn_request_id,
      root_task_id: spawnRequest.root_task_id || parentTask.root_task_id || parentTask.task_id,
      related_task_id: parentTask.task_id,
      related_agent_id: parentTask.assigned_agent_id || null,
      related_spawn_request_id: spawnRequest.spawn_request_id,
      related_approval_request_id: spawnRequest.approval_request_id || null,
      actor_type: actorContext.actor_type || 'system',
      actor_id: actorContext.actor_id || 'spawnProposalService',
      correlation_id: actorContext.correlation_id || parentTask.root_task_id || parentTask.task_id,
      payload_summary: payloadSummary,
      payload_ref: null,
      payload_detail_intent: 'bounded_spawn_proposal_summary',
      append_only: true,
    };

    for (const fieldName of requiredMetadata) {
      if (auditEvent[fieldName] === undefined) {
        throw new Error(`Missing required audit metadata field: ${fieldName}`);
      }
    }

    return auditEvent;
  }

  async function appendSpawnAuditEvent({ eventType, parentTask, spawnRequest, actorContext = {}, payloadSummary = {} }) {
    const audit_event = buildAuditEvent({
      eventType,
      parentTask,
      spawnRequest,
      actorContext,
      payloadSummary,
    });

    return repositories.auditEvents.appendAuditEvent({ audit_event });
  }

  function ensureAllowedApprovalStateTransition(fromState, toState) {
    const allowedNextStates = approvalStateTransitions[fromState] || [];
    if (!allowedNextStates.includes(toState) && fromState !== toState) {
      throw new Error(`Illegal approval_request transition: ${fromState} -> ${toState}`);
    }
  }

  function buildApprovalRequestId({ spawnRequestId }) {
    return `${spawnRequestId}:approval`;
  }

  async function createApprovalRequestForSpawn({
    parentTask,
    proposedSpawnRequest,
    actorContext = {},
  }) {
    const approval_request_id = buildApprovalRequestId({
      spawnRequestId: proposedSpawnRequest.spawn_request_id,
    });

    ensureAllowedApprovalStateTransition(APPROVAL_STATES.PENDING, APPROVAL_STATES.PENDING);

    if (proposedSpawnRequest.approval_request_id) {
      throw new Error(`approval_request already linked for spawn_request: ${proposedSpawnRequest.spawn_request_id}`);
    }

    const approvalRequest = await repositories.approvalRequests.createApprovalRequest({
      approval_request: {
        approval_request_id,
        approval_kind: 'spawn_request',
        target_id: proposedSpawnRequest.spawn_request_id,
        status: APPROVAL_STATES.PENDING,
        requested_at: proposedSpawnRequest.created_at,
        requested_by: proposedSpawnRequest.requested_by,
        reason: proposedSpawnRequest.creation_reason,
        expires_at: proposedSpawnRequest.expires_at || null,
      },
    });

    const linkedSpawnRequest = await repositories.spawnRequests.updateSpawnRequestById({
      spawn_request_id: proposedSpawnRequest.spawn_request_id,
      patch: {
        approval_request_id: approvalRequest.approval_request_id,
        status: SPAWN_REQUEST_STATES.AWAITING_APPROVAL,
        updated_at: new Date().toISOString(),
      },
    });

    if (!linkedSpawnRequest) {
      throw new Error(`Failed to link approval_request to spawn_request: ${proposedSpawnRequest.spawn_request_id}`);
    }

    await repositories.auditEvents.appendAuditEvent({
      audit_event: {
        audit_event_id: `${approvalRequest.approval_request_id}:${AUDIT_EVENT_TYPES.APPROVAL_REQUEST_CREATED}:${Date.now()}`,
        event_type: AUDIT_EVENT_TYPES.APPROVAL_REQUEST_CREATED,
        occurred_at: new Date().toISOString(),
        entity_type: 'approval_request',
        entity_id: approvalRequest.approval_request_id,
        root_task_id: linkedSpawnRequest.root_task_id || parentTask.root_task_id || parentTask.task_id,
        related_task_id: parentTask.task_id,
        related_agent_id: parentTask.assigned_agent_id || null,
        related_spawn_request_id: linkedSpawnRequest.spawn_request_id,
        related_approval_request_id: approvalRequest.approval_request_id,
        actor_type: actorContext.actor_type || 'system',
        actor_id: actorContext.actor_id || 'spawnProposalService',
        correlation_id: actorContext.correlation_id || linkedSpawnRequest.root_task_id || parentTask.root_task_id || parentTask.task_id,
        payload_summary: {
          approval_kind: approvalRequest.approval_kind,
          target_id: approvalRequest.target_id,
          status: approvalRequest.status,
          reason: approvalRequest.reason,
          spawn_request_id: linkedSpawnRequest.spawn_request_id,
          root_task_id: linkedSpawnRequest.root_task_id || null,
        },
        payload_ref: null,
        payload_detail_intent: 'approval_request_creation_summary',
        append_only: true,
      },
    });

    return Object.freeze({
      approval_request: approvalRequest,
      spawn_request: linkedSpawnRequest,
    });
  }

  return Object.freeze({
    async proposeSpawn({
      parent_task_id,
      agent_template_id,
      agent_template_version = null,
      child_task_kind,
      child_task_scope_json,
      requested_by,
      creation_reason,
      justification,
      parent_agent_id = null,
      actor_context = {},
      spawn_request_id,
    }) {
      if (!parent_task_id || !agent_template_id || !child_task_kind || child_task_scope_json === undefined || !requested_by || !creation_reason || !justification || !spawn_request_id) {
        throw new Error('proposeSpawn requires parent_task_id, agent_template_id, child_task_kind, child_task_scope_json, requested_by, creation_reason, justification, and spawn_request_id');
      }

      const parentTask = await loadParentTaskOrThrow(parent_task_id);
      const template = await loadApprovedTemplateOrThrow(agent_template_id, agent_template_version);

      enforceProposalPolicyBounds({
        parentTask,
        template,
        childTaskKind: child_task_kind,
      });

      const spawn_intent_hash = computeSpawnIntentHash({
        parent_task_id,
        agent_template_id: template.agent_template_id,
        child_task_kind,
        child_task_scope_json,
        creation_reason,
      });

      const duplicate = await repositories.spawnRequests.findActiveSpawnRequestByIntentHash({
        parent_task_id,
        spawn_intent_hash,
        active_statuses: [
          SPAWN_REQUEST_STATES.PROPOSED,
          SPAWN_REQUEST_STATES.AWAITING_APPROVAL,
          SPAWN_REQUEST_STATES.APPROVED,
          SPAWN_REQUEST_STATES.INSTANTIATING,
        ],
      });

      if (duplicate) {
        const duplicateSpawnRequest = await repositories.spawnRequests.createSpawnRequest({
          spawn_request: {
            spawn_request_id,
            parent_task_id,
            root_task_id: parentTask.root_task_id || parentTask.task_id,
            child_task_kind,
            child_task_scope_json,
            agent_template_id: template.agent_template_id,
            agent_template_version: template.version,
            status: SPAWN_REQUEST_STATES.DUPLICATE_SUPPRESSED,
            spawn_intent_hash,
            requested_by,
            creation_reason,
            justification,
            approval_required: true,
            parent_agent_id,
            duplicate_of_spawn_request_id: duplicate.spawn_request_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });

        await appendSpawnAuditEvent({
          eventType: AUDIT_EVENT_TYPES.SPAWN_DUPLICATE_SUPPRESSED,
          parentTask,
          spawnRequest: duplicateSpawnRequest,
          actorContext: actor_context,
          payloadSummary: {
            parent_task_id,
            duplicate_of_spawn_request_id: duplicate.spawn_request_id,
            spawn_intent_hash,
            status: duplicateSpawnRequest.status,
            persistence_semantics: 'new_duplicate_suppressed_record_without_prior_persisted_proposed_state',
          },
        });

        return Object.freeze({
          duplicate_suppressed: true,
          spawn_request: duplicateSpawnRequest,
          duplicate_of_spawn_request_id: duplicate.spawn_request_id,
        });
      }

      ensureAllowedSpawnRequestTransition(SPAWN_REQUEST_STATES.PROPOSED, SPAWN_REQUEST_STATES.AWAITING_APPROVAL);

      const now = new Date().toISOString();
      const proposedSpawnRequest = await repositories.spawnRequests.createSpawnRequest({
        spawn_request: {
          spawn_request_id,
          parent_task_id,
          root_task_id: parentTask.root_task_id || parentTask.task_id,
          child_task_kind,
          child_task_scope_json,
          agent_template_id: template.agent_template_id,
          agent_template_version: template.version,
          status: SPAWN_REQUEST_STATES.PROPOSED,
          spawn_intent_hash,
          requested_by,
          creation_reason,
          justification,
          approval_required: true,
          parent_agent_id,
          created_at: now,
          updated_at: now,
        },
      });

      await appendSpawnAuditEvent({
        eventType: AUDIT_EVENT_TYPES.SPAWN_PROPOSED,
        parentTask,
        spawnRequest: proposedSpawnRequest,
        actorContext: actor_context,
        payloadSummary: {
          parent_task_id,
          child_task_kind,
          agent_template_id: template.agent_template_id,
          agent_template_version: template.version,
          spawn_intent_hash,
          status: proposedSpawnRequest.status,
        },
      });

      const { approval_request, spawn_request: spawnRequest } = await createApprovalRequestForSpawn({
        parentTask,
        proposedSpawnRequest,
        actorContext: actor_context,
      });

      await taskLifecycleService.waitForApproval({
        task_id: parent_task_id,
        approval_request_id: approval_request.approval_request_id,
        actor_context,
        reason: 'spawn_proposal_pending_approval',
      });

      return Object.freeze({
        duplicate_suppressed: false,
        spawn_request: spawnRequest,
        approval_request,
      });
    },
  });
}

module.exports = {
  SPAWN_PROPOSAL_SERVICE_CONTRACT,
  createSpawnProposalService,
};
