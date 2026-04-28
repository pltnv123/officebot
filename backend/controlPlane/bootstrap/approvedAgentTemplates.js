// V1 control-plane approved agent template bootstrap definitions only.
// No repository behavior, spawn behavior, approval behavior, executor behavior, or runtime logic belongs here.
// This file defines bootstrap/seed template metadata for the bounded v1 control-plane slice.
// Dynamic template creation and new template classes are out of scope for v1.
// These template definitions do not grant spawn authority by themselves.

const APPROVED_AGENT_TEMPLATES = Object.freeze([
  Object.freeze({
    agent_template_id: 'v1-ephemeral-child-worker',
    template_version: 'v1',
    template_label: 'V1 Ephemeral Child Worker',
    template_kind: 'approved_agent_template',
    lifecycle_class: 'ephemeral_child',

    bootstrap_contract: Object.freeze({
      bootstrap_defined: true,
      bootstrap_scope: 'v1_foundation_seed_only',
      dynamic_template_creation_allowed: false,
      new_template_classes_in_scope: false,
      note: 'This template exists only as an approved bootstrap/seed definition for the bounded v1 slice.',
    }),

    bounded_role_summary: Object.freeze({
      description: 'Temporary child agent template for one bounded child task under explicit approval and later merge-back/retire flow.',
      persistent_agent_behavior: false,
      pooled_worker_behavior: false,
      recursive_spawn_authority: false,
      runtime_spawn_behavior_defined: false,
      runtime_approval_behavior_defined: false,
    }),

    allowed_task_kinds: Object.freeze([
      'bounded_child_execution',
    ]),

    forbidden_actions: Object.freeze([
      'propose_spawn',
      'approve_spawn',
      'deny_spawn',
      'instantiate_child',
      'create_template',
      'modify_template_registry',
      'modify_policy_boundary',
      'grant_capability',
      'self_promote_to_persistent_agent',
      'self_convert_to_pooled_worker',
      'merge_back_directly',
      'bypass_audit',
      'bypass_checkpoint_expectations',
    ]),

    capability_boundary: Object.freeze({
      authority_mode: 'bounded_child_only',
      may_execute_scoped_task: true,
      may_write_checkpoints: true,
      may_emit_audit_events_via_control_plane: true,
      may_return_bounded_result: true,
      may_spawn_children: false,
      may_approve_governance_actions: false,
      may_create_or_modify_templates: false,
      may_expand_its_own_capabilities: false,
      may_claim_persistent_identity: false,
      note: 'This template is execution-scoped only and does not itself gain spawn authority.',
    }),

    governance_contract: Object.freeze({
      required_approval: true,
      max_spawn_depth_supported: 1,
      max_active_children_supported: 1,
      child_may_propose_spawn: false,
      auto_approved_spawn_allowed: false,
      note: 'This template is bounded by v1 governance rules and cannot be interpreted as general recursive agent creation approval.',
    }),

    retirement_policy: Object.freeze({
      lifecycle_intent: 'temporary_agent_retire_after_terminal_child_flow',
      retire_when: Object.freeze([
        'child_task_completed_and_merge_back_recorded',
        'child_task_failed_and_terminal_cleanup_completed',
        'subtree_kill_or_forced_retire_recorded',
      ]),
      must_be_terminally_retired: true,
      persistent_reuse_allowed: false,
      pooled_reuse_allowed: false,
      note: 'The agent is temporary and is expected to retire rather than persist or join a pool.',
    }),

    checkpoint_expectation: Object.freeze({
      checkpoint_required_for_longer_running_child_work: true,
      checkpoint_scope: 'child_task_only',
      checkpoint_history_preserved: true,
      latest_checkpoint_expected: true,
      note: 'Checkpoint behavior is expected later, but this bootstrap definition does not implement it.',
    }),

    merge_back_expectation: Object.freeze({
      parent_resume_required: true,
      direct_parent_mutation_by_child: false,
      bounded_result_expected: true,
      control_plane_mediated_merge_required: true,
      note: 'Child output must return through explicit merge-back handling later and not directly mutate parent state.',
    }),

    audit_expectation: Object.freeze({
      child_instantiation_must_be_audited: true,
      child_checkpoint_activity_must_be_audited: true,
      child_completion_or_failure_must_be_audited: true,
      child_retirement_must_be_audited: true,
      bypass_audit_allowed: false,
      note: 'Audit is mandatory for the full child lifecycle in later bundles.',
    }),
  }),
]);

module.exports = {
  APPROVED_AGENT_TEMPLATES,
};
