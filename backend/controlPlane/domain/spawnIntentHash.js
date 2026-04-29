// V1 control-plane spawn_intent_hash contract only.
// No spawn execution, approval behavior, repository logic, or transition logic belongs here.
// This module defines the deterministic dedupe boundary for logically equivalent spawn intent.
// Equal logical spawn intent must hash identically across retries, restarts, and storage round-trips.
// Important: spawn_intent_hash supports dedupe only and does not authorize spawn.

const SPAWN_INTENT_HASH_RECIPE_VERSION = 'v1';

const SPAWN_INTENT_HASH_CONTRACT = Object.freeze({
  description: 'Deterministic hash contract for deduplicating logically equivalent child spawn intent in v1.',

  purpose: Object.freeze({
    primary_use: 'Detect duplicate spawn proposals for the same logical child intent.',
    non_authority_rule: 'A matching hash may suppress duplicates, but it never grants approval, capability, or execution authority.',
  }),

  recipe: Object.freeze({
    version: SPAWN_INTENT_HASH_RECIPE_VERSION,
    algorithm_class: 'Deterministic canonical payload hash; concrete digest algorithm chosen later must hash the canonical payload bytes exactly as defined here.',
    stability_rule: 'The recipe version must change if any canonical field set or canonicalization rule changes.',
  }),

  canonical_input_set: Object.freeze({
    included_fields: Object.freeze([
      'parent_task_id',
      'agent_template_id',
      'child_task_kind',
      'canonicalized_child_task_scope_json',
      'normalized_creation_reason',
    ]),

    excluded_fields: Object.freeze([
      'spawn_request_id',
      'approval_request_id',
      'idempotency_key',
      'requested_by',
      'justification',
      'created_at',
      'updated_at',
      'approved_by',
      'approved_at',
      'denied_by',
      'denied_at',
      'deny_reason',
      'instantiated_agent_id',
      'instantiated_task_id',
      'duplicate_of_spawn_request_id',
      'expires_at',
      'status',
      'parent_agent_id',
      'root_task_id',
      'approval_required',
      'agent_template_version',
    ]),

    field_semantics: Object.freeze({
      parent_task_id: 'Required stable identifier of the parent task proposing the child spawn.',
      agent_template_id: 'Required approved template identifier selected for the child intent.',
      child_task_kind: 'Required normalized child task kind string.',
      canonicalized_child_task_scope_json: 'Required canonical JSON payload representing child task scope after recursive normalization.',
      normalized_creation_reason: 'Required normalized creation reason string after string normalization rules are applied.',
    }),
  }),

  canonical_payload_shape: Object.freeze({
    recipe_version: 'string; must equal the current hash recipe version',
    parent_task_id: 'string; normalized exactly as provided except for string normalization rules',
    agent_template_id: 'string; normalized exactly as provided except for string normalization rules',
    child_task_kind: 'string; normalized exactly as provided except for string normalization rules',
    child_task_scope_json: 'object|array|scalar; canonicalized according to recursive JSON normalization rules below',
    creation_reason: 'string; normalized creation reason string',
  }),

  canonicalization_rules: Object.freeze({
    field_inclusion_rule: 'Only fields listed in included_fields participate in the canonical payload. All excluded fields and any unknown extra fields are ignored for hashing.',

    object_key_ordering_rule: 'All object keys must be sorted lexicographically ascending at every nesting level before serialization.',

    array_rule: 'Array element order is preserved exactly as supplied. Arrays are not sorted or deduplicated during canonicalization.',

    null_and_empty_handling: Object.freeze({
      null_rule: 'Explicit null values are preserved as null inside child_task_scope_json.',
      empty_object_rule: 'Empty objects are preserved as {}.',
      empty_array_rule: 'Empty arrays are preserved as [].',
      empty_string_rule: 'Empty strings are preserved as empty strings after normalization unless they become invalid by separate validation performed elsewhere.',
      missing_vs_null_rule: 'Missing fields and explicit null are not equivalent. Missing keys remain absent; explicit null remains present as null.',
    }),

    string_normalization_rule: Object.freeze({
      unicode_rule: 'Strings must be normalized to Unicode NFC before hashing.',
      trim_rule: 'Leading and trailing ASCII and Unicode whitespace must be trimmed for parent_task_id, agent_template_id, child_task_kind, and creation_reason.',
      internal_whitespace_rule: 'Internal whitespace is preserved exactly and must not be collapsed.',
      case_rule: 'Case is preserved exactly; no lowercasing or uppercasing is applied unless upstream validation already constrains values.',
      newline_rule: 'Newline characters are preserved exactly after Unicode normalization.',
    }),

    number_rule: 'Numbers inside child_task_scope_json are preserved as numbers. No string coercion, rounding, or unit conversion occurs in canonicalization.',

    boolean_rule: 'Booleans inside child_task_scope_json are preserved exactly as booleans.',

    serialization_rule: 'The canonical payload must be serialized from the recursively normalized structure using a stable JSON serializer that preserves the sorted object-key order and exact array order.',
  }),

  deterministic_boundary: Object.freeze({
    equal_intent_rule: 'If parent_task_id, agent_template_id, child_task_kind, canonicalized child_task_scope_json, and normalized creation_reason are logically equal after canonicalization, the resulting spawn_intent_hash must be identical.',
    unequal_intent_rule: 'If any included canonical field differs after canonicalization, the resulting spawn_intent_hash must differ with normal hash collision assumptions of the later selected digest algorithm.',
    retry_restart_rule: 'The same logical proposal replayed later, by another process, or after restart must produce the same canonical payload and hash if the included inputs are unchanged.',
  }),

  implementation_notes: Object.freeze({
    validation_boundary: 'Validation of whether inputs are allowed is handled elsewhere; this contract defines only what gets normalized and hashed.',
    authority_boundary: 'Hash equality may drive dedupe suppression later, but it does not imply approval, safety, or eligibility to instantiate a child.',
    versioning_boundary: 'Any future change to included fields, normalization rules, or serialization semantics must increment recipe_version and be treated as a new hash contract.',
  }),
});

module.exports = {
  SPAWN_INTENT_HASH_RECIPE_VERSION,
  SPAWN_INTENT_HASH_CONTRACT,
};
