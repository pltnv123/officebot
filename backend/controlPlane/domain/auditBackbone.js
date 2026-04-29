// V1 control-plane audit/event backbone contract only.
// No audit service behavior, event write logic, repository behavior, or runtime logic belongs here.
// This module defines the event envelope, append-only forensic intent, and required event families for v1.
// Audit records are forensic/history artifacts and must not be updated in place during normal runtime operation.

const { AUDIT_EVENT_TYPES } = require('../types/auditEventTypes');

const AUDIT_EVENT_FAMILIES = Object.freeze({
  task_lifecycle: Object.freeze([
    AUDIT_EVENT_TYPES.TASK_CREATED,
    AUDIT_EVENT_TYPES.TASK_READY,
    AUDIT_EVENT_TYPES.TASK_CLAIMED,
    AUDIT_EVENT_TYPES.TASK_STARTED,
    AUDIT_EVENT_TYPES.TASK_HEARTBEAT_RECORDED,
    AUDIT_EVENT_TYPES.TASK_CHECKPOINT_WRITTEN,
    AUDIT_EVENT_TYPES.TASK_WAITING_FOR_APPROVAL,
    AUDIT_EVENT_TYPES.TASK_WAITING_FOR_CHILD,
    AUDIT_EVENT_TYPES.TASK_PAUSED,
    AUDIT_EVENT_TYPES.TASK_RESUMED,
    AUDIT_EVENT_TYPES.TASK_COMPLETED,
    AUDIT_EVENT_TYPES.TASK_FAILED,
    AUDIT_EVENT_TYPES.TASK_RETRY_SCHEDULED,
    AUDIT_EVENT_TYPES.TASK_CANCELLED,
  ]),

  spawn: Object.freeze([
    AUDIT_EVENT_TYPES.SPAWN_PROPOSED,
    AUDIT_EVENT_TYPES.SPAWN_DUPLICATE_SUPPRESSED,
    AUDIT_EVENT_TYPES.SPAWN_APPROVED,
    AUDIT_EVENT_TYPES.SPAWN_DENIED,
    AUDIT_EVENT_TYPES.SPAWN_EXPIRED,
    AUDIT_EVENT_TYPES.CHILD_INSTANTIATION_STARTED,
    AUDIT_EVENT_TYPES.CHILD_INSTANTIATED,
  ]),

  approval: Object.freeze([
    AUDIT_EVENT_TYPES.APPROVAL_REQUEST_CREATED,
    AUDIT_EVENT_TYPES.APPROVAL_REQUEST_APPROVED,
    AUDIT_EVENT_TYPES.APPROVAL_REQUEST_DENIED,
    AUDIT_EVENT_TYPES.APPROVAL_REQUEST_EXPIRED,
    AUDIT_EVENT_TYPES.APPROVAL_REQUEST_CANCELLED,
  ]),

  agent_lifecycle: Object.freeze([
    AUDIT_EVENT_TYPES.AGENT_READY,
    AUDIT_EVENT_TYPES.AGENT_ACTIVE,
    AUDIT_EVENT_TYPES.AGENT_WAITING,
    AUDIT_EVENT_TYPES.AGENT_PAUSED,
    AUDIT_EVENT_TYPES.AGENT_FAILED,
    AUDIT_EVENT_TYPES.AGENT_RETIRING,
    AUDIT_EVENT_TYPES.AGENT_RETIRED,
    AUDIT_EVENT_TYPES.AGENT_ORPHANED,
  ]),

  checkpoint: Object.freeze([
    AUDIT_EVENT_TYPES.TASK_CHECKPOINT_WRITTEN,
  ]),

  merge_retire_safety: Object.freeze([
    AUDIT_EVENT_TYPES.CHILD_RESULT_MERGE_STARTED,
    AUDIT_EVENT_TYPES.CHILD_RESULT_MERGE_COMPLETED,
    AUDIT_EVENT_TYPES.CHILD_RESULT_MERGE_FAILED,
    AUDIT_EVENT_TYPES.SUBTREE_KILL_REQUESTED,
    AUDIT_EVENT_TYPES.LEASE_EXPIRED,
    AUDIT_EVENT_TYPES.MISSED_HEARTBEAT_DETECTED,
    AUDIT_EVENT_TYPES.AGENT_RETIRING,
    AUDIT_EVENT_TYPES.AGENT_RETIRED,
    AUDIT_EVENT_TYPES.AGENT_ORPHANED,
  ]),
});

const AUDIT_EVENT_ENVELOPE = Object.freeze({
  description: 'Canonical audit event envelope for v1 forensic/history records.',

  required_fields: Object.freeze({
    audit_event_id: 'string; unique durable audit event identifier',
    event_type: 'string; must be one of AUDIT_EVENT_TYPES',
    occurred_at: 'string; ISO timestamp when the audited action actually occurred',
    entity_type: 'string; primary entity family, for example task, agent, spawn_request, approval_request, checkpoint',
    entity_id: 'string; durable identifier of the primary entity being audited',
    root_task_id: 'string; root lineage task identifier for end-to-end traceability',
    actor_type: 'string; actor family, for example system, operator, agent, worker',
    actor_id: 'string; durable actor identifier or normalized actor label',
    correlation_id: 'string; durable correlation identifier for connecting related audit records in one flow',
    payload_summary: 'object|string; bounded summary payload for quick forensic inspection',
    append_only: 'boolean; must be true for all v1 audit records',
  }),

  optional_fields: Object.freeze({
    related_task_id: 'string|null; related task identifier for correlation beyond the primary entity',
    related_agent_id: 'string|null; related agent identifier for correlation beyond the primary entity',
    related_spawn_request_id: 'string|null; related spawn request identifier for correlation beyond the primary entity',
    related_approval_request_id: 'string|null; related approval request identifier for correlation beyond the primary entity',
    payload_ref: 'string|null; external or internal payload reference for larger details stored elsewhere later',
    payload_detail_intent: 'string|null; description of what extended payload would contain if not embedded directly',
  }),

  envelope_rules: Object.freeze({
    append_only_rule: 'Audit events are forensic/history records and must not be updated in place during normal runtime operation.',
    immutable_identity_rule: 'audit_event_id is durable and immutable once written.',
    correlation_rule: 'root_task_id and correlation_id must make end-to-end lineage reconstruction possible across task, spawn, approval, agent, checkpoint, merge, and safety events.',
    primary_entity_rule: 'entity_type + entity_id identify the primary object of the audit event even when related_* fields are also present.',
    payload_rule: 'payload_summary should remain bounded and inspectable; payload_ref and payload_detail_intent describe extended detail linkage without changing the event envelope.',
  }),
});

const AUDIT_EVENT_METADATA_CONTRACT = Object.freeze({
  required_metadata: Object.freeze([
    'audit_event_id',
    'event_type',
    'occurred_at',
    'entity_type',
    'entity_id',
    'root_task_id',
    'actor_type',
    'actor_id',
    'correlation_id',
    'payload_summary',
    'append_only',
  ]),

  optional_metadata: Object.freeze([
    'related_task_id',
    'related_agent_id',
    'related_spawn_request_id',
    'related_approval_request_id',
    'payload_ref',
    'payload_detail_intent',
  ]),
});

const AUDIT_EVENT_CORRELATION_CONTRACT = Object.freeze({
  root_task_id: 'Required on all audit records so the full lineage tree can be reconstructed even when the primary entity is not a task.',
  related_task_id: 'Optional secondary task linkage when the primary entity is not the only task implicated.',
  related_agent_id: 'Optional agent linkage when an agent is involved but is not the primary entity.',
  related_spawn_request_id: 'Optional spawn linkage when a spawn request is involved but is not the primary entity.',
  related_approval_request_id: 'Optional approval linkage when an approval request is involved but is not the primary entity.',
  correlation_id: 'Required cross-record flow identifier joining multiple audit events from the same logical operation or chain.',
});

const REQUIRED_V1_AUDIT_EVENT_TYPES = Object.freeze([
  AUDIT_EVENT_TYPES.TASK_CREATED,
  AUDIT_EVENT_TYPES.TASK_CLAIMED,
  AUDIT_EVENT_TYPES.TASK_STARTED,
  AUDIT_EVENT_TYPES.TASK_CHECKPOINT_WRITTEN,
  AUDIT_EVENT_TYPES.TASK_COMPLETED,
  AUDIT_EVENT_TYPES.TASK_FAILED,
  AUDIT_EVENT_TYPES.SPAWN_PROPOSED,
  AUDIT_EVENT_TYPES.SPAWN_DUPLICATE_SUPPRESSED,
  AUDIT_EVENT_TYPES.SPAWN_APPROVED,
  AUDIT_EVENT_TYPES.SPAWN_DENIED,
  AUDIT_EVENT_TYPES.APPROVAL_REQUEST_CREATED,
  AUDIT_EVENT_TYPES.APPROVAL_REQUEST_APPROVED,
  AUDIT_EVENT_TYPES.APPROVAL_REQUEST_DENIED,
  AUDIT_EVENT_TYPES.CHILD_INSTANTIATION_STARTED,
  AUDIT_EVENT_TYPES.CHILD_INSTANTIATED,
  AUDIT_EVENT_TYPES.AGENT_ACTIVE,
  AUDIT_EVENT_TYPES.AGENT_FAILED,
  AUDIT_EVENT_TYPES.CHILD_RESULT_MERGE_STARTED,
  AUDIT_EVENT_TYPES.CHILD_RESULT_MERGE_COMPLETED,
  AUDIT_EVENT_TYPES.CHILD_RESULT_MERGE_FAILED,
  AUDIT_EVENT_TYPES.AGENT_RETIRING,
  AUDIT_EVENT_TYPES.AGENT_RETIRED,
  AUDIT_EVENT_TYPES.SUBTREE_KILL_REQUESTED,
  AUDIT_EVENT_TYPES.LEASE_EXPIRED,
  AUDIT_EVENT_TYPES.MISSED_HEARTBEAT_DETECTED,
]);

const AUDIT_BACKBONE_CONTRACT = Object.freeze({
  event_families: AUDIT_EVENT_FAMILIES,
  event_envelope: AUDIT_EVENT_ENVELOPE,
  metadata_contract: AUDIT_EVENT_METADATA_CONTRACT,
  correlation_contract: AUDIT_EVENT_CORRELATION_CONTRACT,
  required_v1_event_types: REQUIRED_V1_AUDIT_EVENT_TYPES,
  forensic_storage_intent: 'Append-only forensic/history log. Audit records are immutable in normal runtime operation and preserve lineage across the full v1 control-plane flow.',
});

module.exports = {
  AUDIT_EVENT_FAMILIES,
  AUDIT_EVENT_ENVELOPE,
  AUDIT_EVENT_METADATA_CONTRACT,
  AUDIT_EVENT_CORRELATION_CONTRACT,
  REQUIRED_V1_AUDIT_EVENT_TYPES,
  AUDIT_BACKBONE_CONTRACT,
};
