// V1 control-plane storage/schema rollout plan only.
// No repository behavior, service behavior, runtime logic, or migration runner logic belongs here.
// This module defines migration-ready storage intent, entity introduction order, and durable constraints.
// Storage and schema definitions must remain separate from orchestration logic.

const CONTROL_PLANE_SCHEMA_PLAN = Object.freeze({
  description: 'Migration-ready storage rollout plan for the v1 control-plane foundation bundle.',

  introduction_order: Object.freeze([
    'durable_runs',
    'tasks',
    'task_events',
    'agent_templates',
    'spawn_requests',
    'approval_requests',
    'agent_registry',
    'checkpoints',
    'audit_events',
  ]),

  global_storage_intent: Object.freeze({
    durable_identity_rule: 'Every primary entity table uses a durable unique identity key stored as a string identifier.',
    reference_rule: 'Foreign-key/reference intent is explicit even if physical FK enforcement is implemented later by the selected storage engine.',
    append_only_rule: 'task_events and audit_events are append-only stores and must not be updated in-place except for strictly technical backfill/repair workflows approved outside normal runtime paths.',
    dedupe_rule: 'spawn_requests must support durable duplicate suppression using spawn_intent_hash within the active request scope defined below.',
    checkpoint_rule: 'checkpoints are versioned by checkpoint_seq per task and preserve historical checkpoint rows rather than overwriting prior state.',
    durable_run_rule: 'durable_runs persist one explicit bounded runtime shell run object per operator-triggered run and serve as the runtime-shell source of truth across service calls and time.',
  }),

  entities: Object.freeze({
    durable_runs: Object.freeze({
      purpose: 'Persisted bounded durable runtime shell run object for runtime-shell inspection and linkage across calls/time.',
      introduction_index: 1,
      identity: Object.freeze({
        primary_key: 'durable_run_id',
        unique_keys: Object.freeze([
          'durable_run_id',
        ]),
      }),
      references: Object.freeze({
        parent_task_id: 'tasks.task_id',
        root_task_id: 'tasks.task_id',
        child_task_id: 'tasks.task_id',
        approved_spawn_request_id: 'spawn_requests.spawn_request_id',
        approved_approval_request_id: 'approval_requests.approval_request_id',
        denied_spawn_request_id: 'spawn_requests.spawn_request_id',
        denied_approval_request_id: 'approval_requests.approval_request_id',
      }),
      placement: Object.freeze({
        identity_fields: Object.freeze([
          'durable_run_id',
          'parent_task_id',
          'root_task_id',
        ]),
        runtime_fields: Object.freeze([
          'run_status',
          'invocation_name',
          'scenario_name',
          'supervision_enabled',
        ]),
        linkage_fields: Object.freeze([
          'approved_spawn_request_id',
          'approved_approval_request_id',
          'child_task_id',
          'denied_spawn_request_id',
          'denied_approval_request_id',
        ]),
        proof_control_fields: Object.freeze([
          'proof_summary_json',
          'last_control_action',
          'last_control_at',
        ]),
        timestamps: Object.freeze([
          'opened_at',
          'closed_at',
          'created_at',
          'updated_at',
        ]),
      }),
      indexes: Object.freeze([
        'parent_task_id',
        'root_task_id',
        'run_status',
        'invocation_name',
        'child_task_id',
        'approved_spawn_request_id',
        'approved_approval_request_id',
        'opened_at',
        'closed_at',
      ]),
      notes: Object.freeze([
        'V1 durable_runs remain bounded to one explicit run container per operator-triggered invocation.',
        'This table does not imply any worker loop, scheduler ownership, or retry/recovery semantics.',
      ]),
    }),

    tasks: Object.freeze({
      purpose: 'Durable task state for root and child tasks.',
      introduction_index: 2,
      identity: Object.freeze({
        primary_key: 'task_id',
        unique_keys: Object.freeze([
          'task_id',
        ]),
      }),
      references: Object.freeze({
        root_task_id: 'tasks.task_id (self-reference; root lineage anchor)',
        parent_task_id: 'tasks.task_id (self-reference; immediate parent)',
        created_by_agent_id: 'agent_registry.agent_id',
        assigned_agent_id: 'agent_registry.agent_id',
        blocked_on_spawn_request_id: 'spawn_requests.spawn_request_id',
        blocked_on_approval_request_id: 'approval_requests.approval_request_id',
        blocked_on_task_id: 'tasks.task_id',
      }),
      placement: Object.freeze({
        status_fields: Object.freeze([
          'status',
          'wait_reason',
        ]),
        lineage_fields: Object.freeze([
          'root_task_id',
          'parent_task_id',
          'spawn_depth',
          'active_child_count',
        ]),
        lease_fields: Object.freeze([
          'lease_owner',
          'lease_expires_at',
          'heartbeat_at',
        ]),
        execution_fields: Object.freeze([
          'task_kind',
          'task_scope_json',
          'input_payload_json',
          'result_payload_json',
          'error_code',
          'error_message',
          'retry_count',
          'max_retries',
          'checkpoint_seq',
        ]),
        budget_fields: Object.freeze([
          'spawn_budget_used',
          'spawn_budget_limit',
        ]),
        timestamps: Object.freeze([
          'created_at',
          'updated_at',
          'started_at',
          'completed_at',
          'failed_at',
          'cancelled_at',
        ]),
      }),
      indexes: Object.freeze([
        'root_task_id',
        'parent_task_id',
        'status',
        'assigned_agent_id',
        'blocked_on_spawn_request_id',
        'blocked_on_approval_request_id',
      ]),
      notes: Object.freeze([
        'root_task_id equals task_id for root tasks.',
        'active_child_count is stored on the parent task and is part of later policy enforcement.',
      ]),
    }),

    task_events: Object.freeze({
      purpose: 'Append-only task-scoped event stream.',
      introduction_index: 3,
      identity: Object.freeze({
        primary_key: 'event_id',
        unique_keys: Object.freeze([
          'event_id',
        ]),
      }),
      references: Object.freeze({
        task_id: 'tasks.task_id',
        agent_id: 'agent_registry.agent_id',
      }),
      append_only: true,
      placement: Object.freeze({
        event_fields: Object.freeze([
          'event_type',
          'event_payload_json',
          'idempotency_key',
        ]),
        timestamps: Object.freeze([
          'created_at',
        ]),
      }),
      indexes: Object.freeze([
        'task_id',
        'agent_id',
        'event_type',
        'created_at',
        'idempotency_key',
      ]),
      notes: Object.freeze([
        'Task events are append-only and preserve lifecycle history.',
      ]),
    }),

    agent_templates: Object.freeze({
      purpose: 'Approved template registry. V1 expects exactly one enabled ephemeral child template.',
      introduction_index: 4,
      identity: Object.freeze({
        primary_key: 'agent_template_id',
        unique_keys: Object.freeze([
          'agent_template_id',
          'agent_template_id + version',
        ]),
      }),
      references: Object.freeze({}),
      placement: Object.freeze({
        template_identity_fields: Object.freeze([
          'agent_template_id',
          'version',
          'template_name',
          'agent_class',
          'agent_kind',
        ]),
        policy_fields: Object.freeze([
          'allowed_task_kinds_json',
          'capabilities_json',
          'forbidden_capabilities_json',
          'policy_boundary_class',
          'spawn_requires_approval',
          'max_recursion_depth',
          'max_active_children_per_parent',
          'ttl_seconds',
          'enabled',
        ]),
        timestamps: Object.freeze([
          'created_at',
          'updated_at',
        ]),
      }),
      indexes: Object.freeze([
        'enabled',
        'agent_class',
        'agent_kind',
      ]),
      notes: Object.freeze([
        'Dynamic template creation is out of scope for v1 and must not be introduced via runtime writes.',
      ]),
    }),

    spawn_requests: Object.freeze({
      purpose: 'Governed request records for child spawn proposals and dedupe.',
      introduction_index: 5,
      identity: Object.freeze({
        primary_key: 'spawn_request_id',
        unique_keys: Object.freeze([
          'spawn_request_id',
        ]),
        dedupe_unique_intent: 'Active-scope uniqueness over (parent_task_id, spawn_intent_hash) for non-terminal requests.',
      }),
      references: Object.freeze({
        parent_task_id: 'tasks.task_id',
        root_task_id: 'tasks.task_id',
        parent_agent_id: 'agent_registry.agent_id',
        agent_template_id: 'agent_templates.agent_template_id',
        approval_request_id: 'approval_requests.approval_request_id',
        instantiated_agent_id: 'agent_registry.agent_id',
        instantiated_task_id: 'tasks.task_id',
        duplicate_of_spawn_request_id: 'spawn_requests.spawn_request_id',
      }),
      placement: Object.freeze({
        lineage_fields: Object.freeze([
          'parent_task_id',
          'root_task_id',
          'parent_agent_id',
        ]),
        intent_fields: Object.freeze([
          'child_task_kind',
          'child_task_scope_json',
          'agent_template_id',
          'agent_template_version',
          'spawn_intent_hash',
          'creation_reason',
          'justification',
        ]),
        governance_fields: Object.freeze([
          'status',
          'approval_required',
          'approval_request_id',
          'approved_by',
          'approved_at',
          'denied_by',
          'denied_at',
          'deny_reason',
        ]),
        dedupe_fields: Object.freeze([
          'idempotency_key',
          'duplicate_of_spawn_request_id',
        ]),
        instantiation_fields: Object.freeze([
          'instantiated_agent_id',
          'instantiated_task_id',
        ]),
        timestamps: Object.freeze([
          'created_at',
          'updated_at',
          'expires_at',
        ]),
      }),
      indexes: Object.freeze([
        'parent_task_id',
        'root_task_id',
        'parent_agent_id',
        'agent_template_id',
        'status',
        'approval_request_id',
        'instantiated_agent_id',
        'instantiated_task_id',
        'spawn_intent_hash',
        'idempotency_key',
      ]),
      notes: Object.freeze([
        'spawn_intent_hash uniqueness is dedupe-critical and must be scoped to active requests only.',
        'Terminal statuses for active-scope dedupe are defined by lifecycle vocabulary and later guard enforcement.',
      ]),
    }),

    approval_requests: Object.freeze({
      purpose: 'Governance approval records. V1 uses this for spawn approvals only.',
      introduction_index: 6,
      identity: Object.freeze({
        primary_key: 'approval_request_id',
        unique_keys: Object.freeze([
          'approval_request_id',
        ]),
      }),
      references: Object.freeze({
        target_id: 'logical reference to spawn_requests.spawn_request_id in v1 via approval_kind=spawn_request',
      }),
      placement: Object.freeze({
        approval_fields: Object.freeze([
          'approval_kind',
          'target_id',
          'status',
          'requested_by',
          'reason',
          'decision_by',
          'decision_reason',
        ]),
        timestamps: Object.freeze([
          'requested_at',
          'decision_at',
          'expires_at',
        ]),
      }),
      indexes: Object.freeze([
        'approval_kind',
        'target_id',
        'status',
        'requested_at',
        'expires_at',
      ]),
      notes: Object.freeze([
        'approval_kind constrains how target_id should be interpreted.',
      ]),
    }),

    agent_registry: Object.freeze({
      purpose: 'Registry of instantiated agent instances. V1 includes ephemeral child agents only.',
      introduction_index: 7,
      identity: Object.freeze({
        primary_key: 'agent_id',
        unique_keys: Object.freeze([
          'agent_id',
        ]),
      }),
      references: Object.freeze({
        agent_template_id: 'agent_templates.agent_template_id',
        parent_agent_id: 'agent_registry.agent_id',
        spawned_by_spawn_request_id: 'spawn_requests.spawn_request_id',
        spawned_by_task_id: 'tasks.task_id',
        root_task_id: 'tasks.task_id',
        current_task_id: 'tasks.task_id',
        last_checkpoint_id: 'checkpoints.checkpoint_id',
      }),
      placement: Object.freeze({
        identity_fields: Object.freeze([
          'agent_class',
          'agent_template_id',
          'agent_template_version',
          'agent_kind',
        ]),
        lineage_fields: Object.freeze([
          'parent_agent_id',
          'spawned_by_spawn_request_id',
          'spawned_by_task_id',
          'root_task_id',
          'spawn_depth',
          'child_count',
        ]),
        runtime_fields: Object.freeze([
          'current_task_id',
          'task_scope_json',
          'capabilities_json',
          'policy_boundary_class',
          'status',
          'approval_state',
          'lease_owner',
          'lease_expires_at',
          'heartbeat_at',
        ]),
        retirement_fields: Object.freeze([
          'ttl_seconds',
          'retire_at',
          'retired_at',
        ]),
        error_checkpoint_fields: Object.freeze([
          'last_checkpoint_id',
          'last_error_code',
          'last_error_message',
          'creation_reason',
        ]),
        timestamps: Object.freeze([
          'created_at',
          'activated_at',
          'updated_at',
        ]),
      }),
      indexes: Object.freeze([
        'agent_template_id',
        'parent_agent_id',
        'spawned_by_spawn_request_id',
        'spawned_by_task_id',
        'root_task_id',
        'current_task_id',
        'status',
        'approval_state',
      ]),
      notes: Object.freeze([
        'V1 child_count should remain 0 because child agents may not propose spawn.',
      ]),
    }),

    checkpoints: Object.freeze({
      purpose: 'Durable checkpoint history for resumable work.',
      introduction_index: 8,
      identity: Object.freeze({
        primary_key: 'checkpoint_id',
        unique_keys: Object.freeze([
          'checkpoint_id',
          'task_id + checkpoint_seq',
        ]),
      }),
      references: Object.freeze({
        task_id: 'tasks.task_id',
        agent_id: 'agent_registry.agent_id',
      }),
      versioning: Object.freeze({
        sequence_owner: 'task_id',
        sequence_field: 'checkpoint_seq',
        versioning_rule: 'checkpoint_seq must increase monotonically within each task lineage record for checkpoint writes.',
        latest_marker_rule: 'is_latest identifies the newest checkpoint row for a task without deleting historical rows.',
      }),
      placement: Object.freeze({
        checkpoint_fields: Object.freeze([
          'checkpoint_seq',
          'checkpoint_kind',
          'checkpoint_payload_json',
          'is_latest',
        ]),
        actor_fields: Object.freeze([
          'task_id',
          'agent_id',
          'created_by',
        ]),
        timestamps: Object.freeze([
          'created_at',
        ]),
      }),
      indexes: Object.freeze([
        'task_id',
        'agent_id',
        'task_id + checkpoint_seq',
        'task_id + is_latest',
        'created_at',
      ]),
      notes: Object.freeze([
        'Checkpoint rows are historical and must not overwrite prior checkpoint history.',
      ]),
    }),

    audit_events: Object.freeze({
      purpose: 'Append-only control-plane audit log across tasks, agents, spawn requests, approvals, checkpoints, and safety events.',
      introduction_index: 9,
      identity: Object.freeze({
        primary_key: 'audit_event_id',
        unique_keys: Object.freeze([
          'audit_event_id',
        ]),
      }),
      references: Object.freeze({
        entity_id: 'logical reference interpreted by entity_type',
        related_task_id: 'tasks.task_id',
        related_agent_id: 'agent_registry.agent_id',
        related_spawn_request_id: 'spawn_requests.spawn_request_id',
        related_approval_request_id: 'approval_requests.approval_request_id',
      }),
      append_only: true,
      placement: Object.freeze({
        entity_fields: Object.freeze([
          'entity_type',
          'entity_id',
          'event_type',
          'event_payload_json',
        ]),
        actor_fields: Object.freeze([
          'actor_type',
          'actor_id',
        ]),
        correlation_fields: Object.freeze([
          'related_task_id',
          'related_agent_id',
          'related_spawn_request_id',
          'related_approval_request_id',
          'idempotency_key',
        ]),
        timestamps: Object.freeze([
          'created_at',
        ]),
      }),
      indexes: Object.freeze([
        'entity_type',
        'entity_id',
        'event_type',
        'related_task_id',
        'related_agent_id',
        'related_spawn_request_id',
        'related_approval_request_id',
        'created_at',
        'idempotency_key',
      ]),
      notes: Object.freeze([
        'Audit rows are append-only and preserve forensic history.',
      ]),
    }),
  }),
});

module.exports = {
  CONTROL_PLANE_SCHEMA_PLAN,
};
