// V1 control-plane canonical persistence bridge only.
// No repository CRUD behavior, service transitions, spawn behavior, approval behavior,
// executor behavior, API behavior, or runtime hooks belong here.
// This module defines the canonical persisted row shapes and explicit mapping contracts
// that later repository implementations must target.

const PERSISTENCE_SHAPES = Object.freeze({
  agent_templates: Object.freeze({
    description: 'Authoritative persisted row shape for approved agent templates.',
    authoritative_row_shape: Object.freeze({
      agent_template_id: 'string',
      version: 'string|number',
      template_name: 'string',
      agent_class: 'string',
      agent_kind: 'string',
      allowed_task_kinds_json: 'array',
      capabilities_json: 'array|object',
      forbidden_capabilities_json: 'array|object',
      policy_boundary_class: 'string',
      spawn_requires_approval: 'boolean',
      max_recursion_depth: 'number',
      max_active_children_per_parent: 'number',
      ttl_seconds: 'number',
      enabled: 'boolean',
      created_at: 'string',
      updated_at: 'string',
    }),
    persisted_shape_rule: 'This is the single canonical storage-facing row shape for agent_templates in v1.',
  }),

  audit_events: Object.freeze({
    description: 'Authoritative persisted row shape for forensic audit events.',
    authoritative_row_shape: Object.freeze({
      audit_event_id: 'string',
      event_type: 'string',
      occurred_at: 'string',
      entity_type: 'string',
      entity_id: 'string',
      root_task_id: 'string',
      related_task_id: 'string|null',
      related_agent_id: 'string|null',
      related_spawn_request_id: 'string|null',
      related_approval_request_id: 'string|null',
      actor_type: 'string',
      actor_id: 'string',
      correlation_id: 'string',
      payload_summary: 'object|string',
      payload_ref: 'string|null',
      payload_detail_intent: 'string|null',
      append_only: 'boolean',
    }),
    persisted_shape_rule: 'This is the single canonical storage-facing row shape for audit_events in v1.',
  }),
});

const PERSISTENCE_MAPPERS = Object.freeze({
  approved_agent_template_bootstrap_to_persisted_row: Object.freeze({
    source: 'bootstrap approved agent template definition',
    target: 'canonical persisted agent_templates row shape',
    field_mapping: Object.freeze({
      agent_template_id: 'agent_template_id',
      template_version: 'version',
      template_label: 'template_name',
      template_kind: 'not persisted directly in canonical row shape; bootstrap classification only',
      lifecycle_class: 'agent_kind',
      allowed_task_kinds: 'allowed_task_kinds_json',
      'capability_boundary + bounded_role_summary': 'capabilities_json',
      forbidden_actions: 'forbidden_capabilities_json',
      'governance_contract.required_approval': 'spawn_requires_approval',
      'governance_contract.max_spawn_depth_supported': 'max_recursion_depth',
      'governance_contract.max_active_children_supported': 'max_active_children_per_parent',
      'retirement_policy + bounded_role_summary': 'ttl_seconds and policy interpretation source; actual ttl value must be concretized at seed time',
      'bootstrap_contract + bounded_role_summary + governance_contract': 'policy_boundary_class and enabled must be resolved explicitly by seed/bootstrap code later',
    }),
    canonicalization_notes: Object.freeze([
      'Persisted row shape uses schema field names from entitySchemas/schemaPlan, not bootstrap-only names.',
      'Bootstrap-only descriptive fields may remain in bootstrap config but do not become persisted columns unless explicitly mapped.',
      'Seed/bootstrap code later must materialize concrete ttl_seconds, policy_boundary_class, enabled, created_at, and updated_at values.',
    ]),
  }),

  audit_envelope_to_persisted_row: Object.freeze({
    source: 'canonical audit event envelope',
    target: 'canonical persisted audit_events row shape',
    field_mapping: Object.freeze({
      audit_event_id: 'audit_event_id',
      event_type: 'event_type',
      occurred_at: 'occurred_at',
      entity_type: 'entity_type',
      entity_id: 'entity_id',
      root_task_id: 'root_task_id',
      related_task_id: 'related_task_id',
      related_agent_id: 'related_agent_id',
      related_spawn_request_id: 'related_spawn_request_id',
      related_approval_request_id: 'related_approval_request_id',
      actor_type: 'actor_type',
      actor_id: 'actor_id',
      correlation_id: 'correlation_id',
      payload_summary: 'payload_summary',
      payload_ref: 'payload_ref',
      payload_detail_intent: 'payload_detail_intent',
      append_only: 'append_only',
    }),
    canonicalization_notes: Object.freeze([
      'Persisted audit row shape follows audit envelope semantics, not the older event_payload_json/created_at simplification.',
      'occurred_at is the canonical forensic timestamp for persisted audit rows.',
      'Append-only intent is carried as explicit persisted metadata in v1.',
    ]),
  }),
});

const EVENT_STORE_ROLE_SPLIT = Object.freeze({
  task_events: Object.freeze({
    role: 'task-scoped operational append-only history',
    intent: 'Capture operational lifecycle and executor-visible task history for one task context.',
    should_store_cross_entity_forensics: false,
    primary_indexing_axis: 'task_id',
  }),
  audit_events: Object.freeze({
    role: 'cross-entity forensic append-only history',
    intent: 'Capture forensic/audit history across tasks, agents, spawn requests, approvals, checkpoints, merge, and safety events.',
    should_store_cross_entity_forensics: true,
    primary_indexing_axis: 'entity_type + entity_id + correlation linkage',
  }),
  split_rule: 'task_events and audit_events are intentionally separate stores and later implementations must not collapse them by convenience.',
});

module.exports = {
  PERSISTENCE_SHAPES,
  PERSISTENCE_MAPPERS,
  EVENT_STORE_ROLE_SPLIT,
};
