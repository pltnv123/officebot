// V1 control-plane repository interface contracts only.
// No repository implementation, service behavior, transition logic, or runtime logic belongs here.
// Repositories are storage-facing boundaries and must not enforce orchestration policy by themselves.
// Append-only and dedupe-sensitive expectations are defined here as interface intent for later implementations.

const REPOSITORY_INTERFACES = Object.freeze({
  durableRuns: Object.freeze({
    description: 'Durable runtime shell run repository contract for one bounded persisted run object per explicit operator-triggered run.',
    methods: Object.freeze({
      createDurableRun: Object.freeze({
        purpose: 'Insert one durable run record for a bounded runtime shell invocation.',
        input: Object.freeze({
          durable_run: 'durable_runs entity contract payload',
        }),
        output: 'Persisted durable run record.',
        idempotency: 'Caller-managed by durable_run_id uniqueness; repository must not infer orchestration policy.',
      }),

      getDurableRunById: Object.freeze({
        purpose: 'Fetch one persisted durable run by durable_run_id.',
        input: Object.freeze({
          durable_run_id: 'string',
        }),
        output: 'Durable run record or null.',
      }),

      updateDurableRunById: Object.freeze({
        purpose: 'Persist a durable run patch by durable_run_id. Repository does not validate runtime-shell legality.',
        input: Object.freeze({
          durable_run_id: 'string',
          patch: 'object; partial durable run fields to persist',
        }),
        output: 'Updated durable run record or null.',
        idempotency: 'Conditionally idempotent when patch is identical.',
      }),

      listDurableRuns: Object.freeze({
        purpose: 'List persisted durable runs using storage-level filters only.',
        input: Object.freeze({
          filters: 'object|null; optional storage filters such as parent_task_id, root_task_id, run_status, invocation_name',
          limit: 'number|null',
          cursor: 'string|null',
          sort: 'string|null',
        }),
        output: 'List of durable run records with pagination metadata if supported later.',
      }),
    }),
  }),

  tasks: Object.freeze({
    description: 'Durable task record repository contract.',
    methods: Object.freeze({
      createTask: Object.freeze({
        purpose: 'Insert a new task record.',
        input: Object.freeze({
          task: 'tasks entity contract payload',
        }),
        output: 'Persisted task record.',
        idempotency: 'Not inherently idempotent. Caller must prevent duplicate task_id creation.',
      }),

      getTaskById: Object.freeze({
        purpose: 'Fetch one task by durable task_id.',
        input: Object.freeze({
          task_id: 'string',
        }),
        output: 'Task record or null.',
      }),

      listTasks: Object.freeze({
        purpose: 'List tasks using storage-level filters only.',
        input: Object.freeze({
          filters: 'object; optional storage filters such as status, root_task_id, parent_task_id, assigned_agent_id',
          limit: 'number|null',
          cursor: 'string|null',
          sort: 'string|null',
        }),
        output: 'List of task records with pagination metadata if supported later.',
      }),

      updateTaskById: Object.freeze({
        purpose: 'Persist a task record update by task_id. Repository does not validate lifecycle legality.',
        input: Object.freeze({
          task_id: 'string',
          patch: 'object; partial task fields to persist',
        }),
        output: 'Updated task record or null if not found.',
        idempotency: 'Conditionally idempotent when patch is identical.',
      }),

      getTasksByRootTaskId: Object.freeze({
        purpose: 'Fetch all tasks in one lineage tree by root_task_id.',
        input: Object.freeze({
          root_task_id: 'string',
        }),
        output: 'List of task records.',
      }),

      getChildTasksByParentTaskId: Object.freeze({
        purpose: 'Fetch direct child tasks for a parent task.',
        input: Object.freeze({
          parent_task_id: 'string',
          filters: 'object|null; optional filters such as status',
        }),
        output: 'List of child task records.',
      }),

      countActiveChildrenByParentTaskId: Object.freeze({
        purpose: 'Read active child count for a parent task from durable storage.',
        input: Object.freeze({
          parent_task_id: 'string',
          active_statuses: 'array|null; caller-supplied active statuses if needed later',
        }),
        output: 'number',
      }),

      getTasksBlockedOnSpawnRequestId: Object.freeze({
        purpose: 'Fetch tasks waiting on a specific spawn request.',
        input: Object.freeze({
          blocked_on_spawn_request_id: 'string',
        }),
        output: 'List of task records.',
      }),

      getTasksBlockedOnApprovalRequestId: Object.freeze({
        purpose: 'Fetch tasks waiting on a specific approval request.',
        input: Object.freeze({
          blocked_on_approval_request_id: 'string',
        }),
        output: 'List of task records.',
      }),
    }),
  }),

  taskEvents: Object.freeze({
    description: 'Append-only task event repository contract.',
    methods: Object.freeze({
      appendTaskEvent: Object.freeze({
        purpose: 'Append one task event row without mutating prior history.',
        input: Object.freeze({
          event: 'task_events entity contract payload',
        }),
        output: 'Persisted task event row.',
        append_only: true,
        idempotency: 'May support caller-provided idempotency_key based duplicate-safe writes later; repository should not overwrite prior event history.',
      }),

      getTaskEventById: Object.freeze({
        purpose: 'Fetch one task event by event_id.',
        input: Object.freeze({
          event_id: 'string',
        }),
        output: 'Task event row or null.',
      }),

      listTaskEventsByTaskId: Object.freeze({
        purpose: 'List task event history for one task.',
        input: Object.freeze({
          task_id: 'string',
          limit: 'number|null',
          cursor: 'string|null',
          sort: 'string|null; typically created_at ascending or descending',
        }),
        output: 'List of task event rows.',
      }),

      listTaskEventsByAgentId: Object.freeze({
        purpose: 'List task events associated with one agent.',
        input: Object.freeze({
          agent_id: 'string',
          limit: 'number|null',
          cursor: 'string|null',
        }),
        output: 'List of task event rows.',
      }),
    }),
  }),

  agentTemplates: Object.freeze({
    description: 'Approved agent template registry repository contract.',
    methods: Object.freeze({
      createAgentTemplate: Object.freeze({
        purpose: 'Insert an approved template record during bootstrap/seed workflows.',
        input: Object.freeze({
          template: 'agent_templates entity contract payload',
        }),
        output: 'Persisted template record.',
        idempotency: 'Caller-managed; later seed flows may rely on agent_template_id + version uniqueness.',
      }),

      getAgentTemplateById: Object.freeze({
        purpose: 'Fetch one template by agent_template_id.',
        input: Object.freeze({
          agent_template_id: 'string',
        }),
        output: 'Template record or null.',
      }),

      getAgentTemplateByIdAndVersion: Object.freeze({
        purpose: 'Fetch one template by stable id and version.',
        input: Object.freeze({
          agent_template_id: 'string',
          version: 'string|number',
        }),
        output: 'Template record or null.',
      }),

      listAgentTemplates: Object.freeze({
        purpose: 'List templates using storage-level filters only.',
        input: Object.freeze({
          filters: 'object|null; optional filters such as enabled, agent_class, agent_kind',
        }),
        output: 'List of template records.',
      }),

      updateAgentTemplateByIdAndVersion: Object.freeze({
        purpose: 'Persist template field updates for an existing version.',
        input: Object.freeze({
          agent_template_id: 'string',
          version: 'string|number',
          patch: 'object',
        }),
        output: 'Updated template record or null.',
        idempotency: 'Conditionally idempotent when patch is identical.',
      }),
    }),
  }),

  spawnRequests: Object.freeze({
    description: 'Governed spawn request repository contract, including dedupe-sensitive lookups.',
    methods: Object.freeze({
      createSpawnRequest: Object.freeze({
        purpose: 'Insert a new spawn request record.',
        input: Object.freeze({
          spawn_request: 'spawn_requests entity contract payload',
        }),
        output: 'Persisted spawn request record.',
        idempotency: 'Not inherently idempotent. Later service logic must coordinate dedupe and idempotency expectations.',
      }),

      getSpawnRequestById: Object.freeze({
        purpose: 'Fetch one spawn request by spawn_request_id.',
        input: Object.freeze({
          spawn_request_id: 'string',
        }),
        output: 'Spawn request record or null.',
      }),

      listSpawnRequests: Object.freeze({
        purpose: 'List spawn requests using storage-level filters only.',
        input: Object.freeze({
          filters: 'object|null; optional filters such as parent_task_id, root_task_id, status, approval_request_id',
          limit: 'number|null',
          cursor: 'string|null',
        }),
        output: 'List of spawn request records.',
      }),

      updateSpawnRequestById: Object.freeze({
        purpose: 'Persist a spawn request patch by identifier. Repository does not enforce transition legality.',
        input: Object.freeze({
          spawn_request_id: 'string',
          patch: 'object',
        }),
        output: 'Updated spawn request record or null.',
        idempotency: 'Conditionally idempotent when patch is identical.',
      }),

      findActiveSpawnRequestByIntentHash: Object.freeze({
        purpose: 'Lookup an active-scope spawn request by parent_task_id and spawn_intent_hash for dedupe-sensitive reads.',
        input: Object.freeze({
          parent_task_id: 'string',
          spawn_intent_hash: 'string',
          active_statuses: 'array; caller-supplied statuses treated as active scope',
        }),
        output: 'Matching active-scope spawn request record or null.',
        dedupe_sensitive: true,
      }),

      listSpawnRequestsByParentTaskId: Object.freeze({
        purpose: 'List spawn requests created by one parent task.',
        input: Object.freeze({
          parent_task_id: 'string',
          filters: 'object|null; optional filters such as status',
        }),
        output: 'List of spawn request records.',
      }),

      getSpawnRequestByApprovalRequestId: Object.freeze({
        purpose: 'Fetch the spawn request linked to one approval request.',
        input: Object.freeze({
          approval_request_id: 'string',
        }),
        output: 'Spawn request record or null.',
      }),

      listSpawnRequestsByRootTaskId: Object.freeze({
        purpose: 'List spawn requests within one root lineage tree.',
        input: Object.freeze({
          root_task_id: 'string',
        }),
        output: 'List of spawn request records.',
      }),
    }),
  }),

  approvalRequests: Object.freeze({
    description: 'Approval request repository contract for governed decisions.',
    methods: Object.freeze({
      createApprovalRequest: Object.freeze({
        purpose: 'Insert a new approval request record.',
        input: Object.freeze({
          approval_request: 'approval_requests entity contract payload',
        }),
        output: 'Persisted approval request record.',
        idempotency: 'Not inherently idempotent. Caller must manage duplicate creation.',
      }),

      getApprovalRequestById: Object.freeze({
        purpose: 'Fetch one approval request by approval_request_id.',
        input: Object.freeze({
          approval_request_id: 'string',
        }),
        output: 'Approval request record or null.',
      }),

      listApprovalRequests: Object.freeze({
        purpose: 'List approval requests using storage-level filters only.',
        input: Object.freeze({
          filters: 'object|null; optional filters such as approval_kind, target_id, status',
          limit: 'number|null',
          cursor: 'string|null',
        }),
        output: 'List of approval request records.',
      }),

      updateApprovalRequestById: Object.freeze({
        purpose: 'Persist an approval request patch by identifier. Repository does not enforce transition legality.',
        input: Object.freeze({
          approval_request_id: 'string',
          patch: 'object',
        }),
        output: 'Updated approval request record or null.',
        idempotency: 'Conditionally idempotent when patch is identical.',
      }),

      findApprovalRequestByTarget: Object.freeze({
        purpose: 'Lookup approval requests by approval_kind and target_id.',
        input: Object.freeze({
          approval_kind: 'string',
          target_id: 'string',
        }),
        output: 'Approval request record or list of approval request records depending on storage implementation later.',
      }),

      getApprovalRequestBySpawnRequestId: Object.freeze({
        purpose: 'Resolve approval request linked to a spawn request by related identifiers.',
        input: Object.freeze({
          spawn_request_id: 'string',
        }),
        output: 'Approval request record or null.',
        note: 'May be implemented later either through direct join path from spawn_requests.approval_request_id or by target lookup.',
      }),
    }),
  }),

  agentRegistry: Object.freeze({
    description: 'Durable agent instance registry repository contract.',
    methods: Object.freeze({
      createAgent: Object.freeze({
        purpose: 'Insert a new agent instance record.',
        input: Object.freeze({
          agent: 'agent_registry entity contract payload',
        }),
        output: 'Persisted agent record.',
        idempotency: 'Not inherently idempotent. Caller must prevent duplicate agent_id creation.',
      }),

      getAgentById: Object.freeze({
        purpose: 'Fetch one agent instance by agent_id.',
        input: Object.freeze({
          agent_id: 'string',
        }),
        output: 'Agent record or null.',
      }),

      listAgents: Object.freeze({
        purpose: 'List agents using storage-level filters only.',
        input: Object.freeze({
          filters: 'object|null; optional filters such as status, root_task_id, current_task_id, parent_agent_id',
          limit: 'number|null',
          cursor: 'string|null',
        }),
        output: 'List of agent records.',
      }),

      updateAgentById: Object.freeze({
        purpose: 'Persist an agent patch by identifier. Repository does not enforce transition legality.',
        input: Object.freeze({
          agent_id: 'string',
          patch: 'object',
        }),
        output: 'Updated agent record or null.',
        idempotency: 'Conditionally idempotent when patch is identical.',
      }),

      listAgentsByRootTaskId: Object.freeze({
        purpose: 'Fetch all agent instances in one root lineage tree.',
        input: Object.freeze({
          root_task_id: 'string',
        }),
        output: 'List of agent records.',
      }),

      listAgentsByParentAgentId: Object.freeze({
        purpose: 'Fetch direct child agents for one parent agent.',
        input: Object.freeze({
          parent_agent_id: 'string',
          filters: 'object|null; optional status filters',
        }),
        output: 'List of child agent records.',
      }),

      listAgentsBySpawnRequestId: Object.freeze({
        purpose: 'Fetch agents instantiated from a specific spawn request.',
        input: Object.freeze({
          spawned_by_spawn_request_id: 'string',
        }),
        output: 'List of agent records.',
      }),

      getCurrentAgentForTask: Object.freeze({
        purpose: 'Fetch the current agent assigned to a task, if any.',
        input: Object.freeze({
          current_task_id: 'string',
        }),
        output: 'Agent record or null.',
      }),
    }),
  }),

  checkpoints: Object.freeze({
    description: 'Durable checkpoint repository contract with history and latest-read support.',
    methods: Object.freeze({
      appendCheckpoint: Object.freeze({
        purpose: 'Insert a new checkpoint row while preserving prior checkpoint history.',
        input: Object.freeze({
          checkpoint: 'checkpoints entity contract payload',
        }),
        output: 'Persisted checkpoint row.',
        append_only: true,
        idempotency: 'Caller-managed unless later implementations add dedupe on task_id + checkpoint_seq.',
      }),

      getCheckpointById: Object.freeze({
        purpose: 'Fetch one checkpoint by checkpoint_id.',
        input: Object.freeze({
          checkpoint_id: 'string',
        }),
        output: 'Checkpoint row or null.',
      }),

      listCheckpointHistoryByTaskId: Object.freeze({
        purpose: 'Fetch historical checkpoints for one task.',
        input: Object.freeze({
          task_id: 'string',
          limit: 'number|null',
          cursor: 'string|null',
          sort: 'string|null; typically checkpoint_seq descending or ascending',
        }),
        output: 'List of checkpoint rows.',
      }),

      getLatestCheckpointByTaskId: Object.freeze({
        purpose: 'Fetch the latest checkpoint for one task.',
        input: Object.freeze({
          task_id: 'string',
        }),
        output: 'Latest checkpoint row or null.',
      }),

      listCheckpointsByAgentId: Object.freeze({
        purpose: 'Fetch checkpoints associated with one agent.',
        input: Object.freeze({
          agent_id: 'string',
          limit: 'number|null',
        }),
        output: 'List of checkpoint rows.',
      }),
    }),
  }),

  auditEvents: Object.freeze({
    description: 'Append-only control-plane audit repository contract.',
    methods: Object.freeze({
      appendAuditEvent: Object.freeze({
        purpose: 'Append one audit event row without mutating prior history.',
        input: Object.freeze({
          audit_event: 'audit_events entity contract payload',
        }),
        output: 'Persisted audit event row.',
        append_only: true,
        idempotency: 'May support idempotency_key-based duplicate-safe writes later; repository must preserve prior audit history.',
      }),

      getAuditEventById: Object.freeze({
        purpose: 'Fetch one audit event by audit_event_id.',
        input: Object.freeze({
          audit_event_id: 'string',
        }),
        output: 'Audit event row or null.',
      }),

      listAuditEvents: Object.freeze({
        purpose: 'List audit events using storage-level filters only.',
        input: Object.freeze({
          filters: 'object|null; optional filters such as entity_type, entity_id, event_type, related_task_id, related_agent_id',
          limit: 'number|null',
          cursor: 'string|null',
          sort: 'string|null; typically created_at descending or ascending',
        }),
        output: 'List of audit event rows.',
      }),

      listAuditEventsByEntity: Object.freeze({
        purpose: 'Fetch audit history for one primary entity.',
        input: Object.freeze({
          entity_type: 'string',
          entity_id: 'string',
          limit: 'number|null',
        }),
        output: 'List of audit event rows.',
      }),

      listAuditEventsByCorrelation: Object.freeze({
        purpose: 'Fetch audit events by related correlation identifiers.',
        input: Object.freeze({
          related_task_id: 'string|null',
          related_agent_id: 'string|null',
          related_spawn_request_id: 'string|null',
          related_approval_request_id: 'string|null',
          limit: 'number|null',
        }),
        output: 'List of audit event rows.',
      }),
    }),
  }),
});

module.exports = {
  REPOSITORY_INTERFACES,
};
