// V1 control-plane task lifecycle service.
// This module is the only allowed mediator of task lifecycle transitions in v1.
// No spawn behavior, approval behavior, child instantiation, merge-back behavior,
// repository implementation, API wiring, or runtime builder authority belongs here.

const { TASK_STATES } = require('../types/taskStates');
const { AUDIT_EVENT_TYPES } = require('../types/auditEventTypes');
const { TRANSITION_GUARD_CONTRACT } = require('../domain/transitionGuards');
const { AUDIT_BACKBONE_CONTRACT } = require('../domain/auditBackbone');

const TASK_LIFECYCLE_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'taskLifecycleService',
    service_role: 'centralized_task_lifecycle_transition_mediator',
    ownership_rule: 'The service layer is the only allowed mediator of task lifecycle transitions in v1.',
    forbidden_direct_mutators: Object.freeze([
      'repositories',
      'routes',
      'helper_chains',
      'runtime_builders',
      'ad_hoc_call_sites',
    ]),
  }),

  dependency_expectations: Object.freeze({
    repository_interfaces: Object.freeze([
      'tasks repository',
      'task events repository',
      'checkpoints repository',
      'audit events repository',
    ]),
    transition_guard_contract: 'Required for validating allowed task state transitions before persistence.',
    audit_backbone_contract: 'Required for emitting canonical append-only audit records for implemented lifecycle transitions.',
  }),

  implemented_methods: Object.freeze([
    'createTask',
    'markTaskReady',
    'claimTask',
    'startTask',
    'recordCheckpoint',
    'completeTask',
    'recordChildResultMerge',
    'waitForApproval',
    'waitForChild',
    'resumeTask',
    'cancelTask',
    'failTask',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'pauseTask',
    'scheduleRetry',
    'spawn behavior',
    'approval behavior beyond waiting_for_approval task state mediation',
    'child instantiation',
    'merge_back behavior',
    'executor loop integration',
    'repository implementations',
    'API/runtime behavior',
  ]),
});

function createTaskLifecycleService({ repositories, transitionGuardContract = TRANSITION_GUARD_CONTRACT } = {}) {
  if (!repositories || !repositories.tasks || !repositories.taskEvents || !repositories.checkpoints || !repositories.auditEvents) {
    throw new Error('taskLifecycleService requires repositories.tasks, repositories.taskEvents, repositories.checkpoints, and repositories.auditEvents');
  }

  const taskTransitions = transitionGuardContract.task_state_transitions || {};

  function ensureAllowedTransition(fromState, toState) {
    const allowedNextStates = taskTransitions[fromState] || [];
    if (!allowedNextStates.includes(toState)) {
      throw new Error(`Illegal task transition: ${fromState} -> ${toState}`);
    }
  }

  async function appendLifecycleTaskEvent({ task, eventType, actorContext = {}, payload = {} }) {
    const event = {
      event_id: payload.event_id || `${task.task_id}:${eventType}:${Date.now()}`,
      task_id: task.task_id,
      event_type: eventType,
      event_payload_json: {
        status: task.status,
        actor_context: actorContext,
        ...payload,
      },
      created_at: payload.created_at || new Date().toISOString(),
      agent_id: task.assigned_agent_id || null,
      idempotency_key: payload.idempotency_key || null,
    };

    return repositories.taskEvents.appendTaskEvent({ event });
  }

  function buildAuditEvent({ task, eventType, actorContext = {}, payload = {}, occurredAt = null }) {
    const requiredMetadata = AUDIT_BACKBONE_CONTRACT.metadata_contract.required_metadata;
    const auditEvent = {
      audit_event_id: payload.audit_event_id || `${task.task_id}:${eventType}:${Date.now()}`,
      event_type: eventType,
      occurred_at: occurredAt || new Date().toISOString(),
      entity_type: 'task',
      entity_id: task.task_id,
      root_task_id: task.root_task_id || task.task_id,
      related_task_id: task.task_id,
      related_agent_id: task.assigned_agent_id || null,
      related_spawn_request_id: task.blocked_on_spawn_request_id || null,
      related_approval_request_id: task.blocked_on_approval_request_id || null,
      actor_type: actorContext.actor_type || 'system',
      actor_id: actorContext.actor_id || 'taskLifecycleService',
      correlation_id: actorContext.correlation_id || task.root_task_id || task.task_id,
      payload_summary: {
        task_status: task.status,
        wait_reason: task.wait_reason || null,
        reason: payload.reason || null,
        error_code: payload.error_code || null,
        error_message: payload.error_message || null,
      },
      payload_ref: payload.payload_ref || null,
      payload_detail_intent: payload.payload_detail_intent || 'bounded_task_lifecycle_transition_summary',
      append_only: true,
    };

    for (const fieldName of requiredMetadata) {
      if (auditEvent[fieldName] === undefined) {
        throw new Error(`Missing required audit metadata field: ${fieldName}`);
      }
    }

    return auditEvent;
  }

  async function appendLifecycleAuditEvent({ task, auditEventType, actorContext = {}, payload = {}, occurredAt = null }) {
    const audit_event = buildAuditEvent({
      task,
      eventType: auditEventType,
      actorContext,
      payload,
      occurredAt,
    });

    return repositories.auditEvents.appendAuditEvent({ audit_event });
  }

  async function loadTaskOrThrow(taskId) {
    const task = await repositories.tasks.getTaskById({ task_id: taskId });
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return task;
  }

  async function transitionTask({
    taskId,
    toState,
    patch = {},
    actorContext = {},
    reason = null,
    eventType,
    auditEventType,
    auditPayload = {},
  }) {
    const currentTask = await loadTaskOrThrow(taskId);
    ensureAllowedTransition(currentTask.status, toState);

    const updatedTask = await repositories.tasks.updateTaskById({
      task_id: taskId,
      patch: {
        ...patch,
        status: toState,
        updated_at: patch.updated_at || new Date().toISOString(),
      },
    });

    if (!updatedTask) {
      throw new Error(`Failed to update task: ${taskId}`);
    }

    const taskEventPayload = reason ? { reason } : {};

    await appendLifecycleTaskEvent({
      task: updatedTask,
      eventType,
      actorContext,
      payload: taskEventPayload,
    });

    await appendLifecycleAuditEvent({
      task: updatedTask,
      auditEventType,
      actorContext,
      payload: {
        ...taskEventPayload,
        ...auditPayload,
      },
      occurredAt: updatedTask.updated_at,
    });

    return updatedTask;
  }

  return Object.freeze({
    async createTask({ task_definition, actor_context = {} }) {
      const initialStatus = task_definition.status || TASK_STATES.CREATED;
      if (initialStatus !== TASK_STATES.CREATED) {
        throw new Error(`Illegal initial task state: ${initialStatus}`);
      }

      const now = new Date().toISOString();
      const task = {
        ...task_definition,
        status: TASK_STATES.CREATED,
        root_task_id: task_definition.root_task_id || task_definition.task_id,
        spawn_depth: task_definition.spawn_depth ?? 0,
        active_child_count: task_definition.active_child_count ?? 0,
        spawn_budget_used: task_definition.spawn_budget_used ?? 0,
        retry_count: task_definition.retry_count ?? 0,
        checkpoint_seq: task_definition.checkpoint_seq ?? 0,
        created_at: task_definition.created_at || now,
        updated_at: task_definition.updated_at || now,
      };

      const createdTask = await repositories.tasks.createTask({ task });

      await appendLifecycleTaskEvent({
        task: createdTask,
        eventType: 'task_created',
        actorContext: actor_context,
      });

      await appendLifecycleAuditEvent({
        task: createdTask,
        auditEventType: AUDIT_EVENT_TYPES.TASK_CREATED,
        actorContext: actor_context,
        occurredAt: createdTask.created_at,
      });

      return createdTask;
    },

    async markTaskReady({ task_id, actor_context = {}, reason = null }) {
      return transitionTask({
        taskId: task_id,
        toState: TASK_STATES.READY,
        actorContext: actor_context,
        reason,
        eventType: 'task_ready',
        auditEventType: AUDIT_EVENT_TYPES.TASK_READY,
        patch: {
          wait_reason: null,
          blocked_on_approval_request_id: null,
          lease_owner: null,
          lease_expires_at: null,
        },
      });
    },

    async claimTask({ task_id, lease_owner, lease_expires_at = null, actor_context = {} }) {
      if (!lease_owner) {
        throw new Error('claimTask requires lease_owner');
      }

      return transitionTask({
        taskId: task_id,
        toState: TASK_STATES.CLAIMED,
        actorContext: actor_context,
        eventType: 'task_claimed',
        auditEventType: AUDIT_EVENT_TYPES.TASK_CLAIMED,
        patch: {
          lease_owner,
          lease_expires_at,
        },
      });
    },

    async startTask({ task_id, started_at = null, actor_context = {} }) {
      return transitionTask({
        taskId: task_id,
        toState: TASK_STATES.RUNNING,
        actorContext: actor_context,
        eventType: 'task_started',
        auditEventType: AUDIT_EVENT_TYPES.TASK_STARTED,
        patch: {
          started_at: started_at || new Date().toISOString(),
          wait_reason: null,
        },
      });
    },

    async recordCheckpoint({
      task_id,
      checkpoint_id,
      checkpoint_kind,
      checkpoint_payload_json,
      created_by,
      agent_id = null,
      actor_context = {},
    }) {
      if (!checkpoint_id) {
        throw new Error('recordCheckpoint requires checkpoint_id');
      }

      if (!checkpoint_kind) {
        throw new Error('recordCheckpoint requires checkpoint_kind');
      }

      if (checkpoint_payload_json === undefined) {
        throw new Error('recordCheckpoint requires checkpoint_payload_json');
      }

      if (!created_by) {
        throw new Error('recordCheckpoint requires created_by');
      }

      const currentTask = await loadTaskOrThrow(task_id);
      const nextCheckpointSeq = (currentTask.checkpoint_seq || 0) + 1;
      const checkpointCreatedAt = new Date().toISOString();

      const checkpoint = await repositories.checkpoints.appendCheckpoint({
        checkpoint: {
          checkpoint_id,
          task_id,
          checkpoint_seq: nextCheckpointSeq,
          checkpoint_kind,
          checkpoint_payload_json,
          created_at: checkpointCreatedAt,
          created_by,
          is_latest: true,
          agent_id,
        },
      });

      const updatedTask = await repositories.tasks.updateTaskById({
        task_id,
        patch: {
          checkpoint_seq: nextCheckpointSeq,
          updated_at: checkpointCreatedAt,
        },
      });

      if (!updatedTask) {
        throw new Error(`Failed to update task checkpoint state: ${task_id}`);
      }

      await appendLifecycleTaskEvent({
        task: updatedTask,
        eventType: 'task_checkpoint_written',
        actorContext: actor_context,
        payload: {
          checkpoint_id,
          checkpoint_seq: nextCheckpointSeq,
          checkpoint_kind,
        },
      });

      await appendLifecycleAuditEvent({
        task: updatedTask,
        auditEventType: AUDIT_EVENT_TYPES.TASK_CHECKPOINT_WRITTEN,
        actorContext: actor_context,
        payload: {
          checkpoint_id,
          checkpoint_seq: nextCheckpointSeq,
          checkpoint_kind,
        },
        occurredAt: checkpointCreatedAt,
      });

      return Object.freeze({
        task: updatedTask,
        checkpoint,
      });
    },

    async completeTask({ task_id, result_payload_json = null, actor_context = {} }) {
      return transitionTask({
        taskId: task_id,
        toState: TASK_STATES.COMPLETED,
        actorContext: actor_context,
        eventType: 'task_completed',
        auditEventType: AUDIT_EVENT_TYPES.TASK_COMPLETED,
        patch: {
          result_payload_json,
          completed_at: new Date().toISOString(),
          wait_reason: null,
          blocked_on_spawn_request_id: null,
          blocked_on_task_id: null,
          blocked_on_approval_request_id: null,
          lease_owner: null,
          lease_expires_at: null,
        },
      });
    },

    async recordChildResultMerge({
      task_id,
      child_task_id,
      spawn_request_id,
      merge_payload_json,
      actor_context = {},
      merge_started_at = null,
      merge_completed_at = null,
    }) {
      if (!child_task_id) {
        throw new Error('recordChildResultMerge requires child_task_id');
      }

      if (!spawn_request_id) {
        throw new Error('recordChildResultMerge requires spawn_request_id');
      }

      if (merge_payload_json === undefined) {
        throw new Error('recordChildResultMerge requires merge_payload_json');
      }

      const parentTask = await loadTaskOrThrow(task_id);
      const mergeStartedAt = merge_started_at || new Date().toISOString();

      await appendLifecycleTaskEvent({
        task: parentTask,
        eventType: 'child_result_merge_started',
        actorContext: actor_context,
        payload: {
          child_task_id,
          spawn_request_id,
          created_at: mergeStartedAt,
        },
      });

      await appendLifecycleAuditEvent({
        task: parentTask,
        auditEventType: AUDIT_EVENT_TYPES.CHILD_RESULT_MERGE_STARTED,
        actorContext: actor_context,
        payload: {
          child_task_id,
          spawn_request_id,
        },
        occurredAt: mergeStartedAt,
      });

      const mergeCompletedAt = merge_completed_at || new Date().toISOString();
      const mergedResultPayload = {
        ...(parentTask.result_payload_json || {}),
        merged_child_result: {
          child_task_id,
          spawn_request_id,
          merged_at: mergeCompletedAt,
          child_result: merge_payload_json,
        },
      };

      const updatedParentTask = await repositories.tasks.updateTaskById({
        task_id,
        patch: {
          result_payload_json: mergedResultPayload,
          updated_at: mergeCompletedAt,
        },
      });

      if (!updatedParentTask) {
        throw new Error(`Failed to persist child result merge for task: ${task_id}`);
      }

      await appendLifecycleTaskEvent({
        task: updatedParentTask,
        eventType: 'child_result_merge_completed',
        actorContext: actor_context,
        payload: {
          child_task_id,
          spawn_request_id,
          created_at: mergeCompletedAt,
        },
      });

      await appendLifecycleAuditEvent({
        task: updatedParentTask,
        auditEventType: AUDIT_EVENT_TYPES.CHILD_RESULT_MERGE_COMPLETED,
        actorContext: actor_context,
        payload: {
          child_task_id,
          spawn_request_id,
        },
        occurredAt: mergeCompletedAt,
      });

      return Object.freeze({
        parent_task: updatedParentTask,
      });
    },

    async waitForApproval({ task_id, approval_request_id, actor_context = {}, reason = null }) {
      if (!approval_request_id) {
        throw new Error('waitForApproval requires approval_request_id');
      }

      return transitionTask({
        taskId: task_id,
        toState: TASK_STATES.WAITING_FOR_APPROVAL,
        actorContext: actor_context,
        reason,
        eventType: 'task_waiting_for_approval',
        auditEventType: AUDIT_EVENT_TYPES.TASK_WAITING_FOR_APPROVAL,
        patch: {
          wait_reason: TASK_STATES.WAITING_FOR_APPROVAL,
          blocked_on_approval_request_id: approval_request_id,
        },
      });
    },

    async waitForChild({
      task_id,
      spawn_request_id,
      child_task_id,
      actor_context = {},
      reason = null,
      taskflow_wait_resume = null,
    }) {
      if (!spawn_request_id) {
        throw new Error('waitForChild requires spawn_request_id');
      }

      if (!child_task_id) {
        throw new Error('waitForChild requires child_task_id');
      }

      return transitionTask({
        taskId: task_id,
        toState: TASK_STATES.WAITING_FOR_CHILD,
        actorContext: actor_context,
        reason,
        eventType: 'task_waiting_for_child',
        auditEventType: AUDIT_EVENT_TYPES.TASK_WAITING_FOR_CHILD,
        auditPayload: {
          child_task_id,
          spawn_request_id,
          taskflow_wait_resume_carrier: taskflow_wait_resume ? {
            carrier_kind: taskflow_wait_resume.carrier_kind,
            flow_id: taskflow_wait_resume.flow_id,
            current_step: taskflow_wait_resume.current_step,
            status: taskflow_wait_resume.status,
          } : null,
        },
        patch: {
          wait_reason: TASK_STATES.WAITING_FOR_CHILD,
          blocked_on_spawn_request_id: spawn_request_id,
          blocked_on_task_id: child_task_id,
          blocked_on_approval_request_id: null,
          wait_context_json: taskflow_wait_resume ? {
            taskflow_wait_resume,
          } : null,
        },
      });
    },

    async resumeTask({ task_id, actor_context = {}, reason = null, taskflow_wait_resume = null }) {
      const currentTask = await loadTaskOrThrow(task_id);
      const resumedState = currentTask.status === TASK_STATES.PAUSED
        || currentTask.status === TASK_STATES.RETRY_SCHEDULED
        ? TASK_STATES.READY
        : TASK_STATES.RUNNING;

      return transitionTask({
        taskId: task_id,
        toState: resumedState,
        actorContext: actor_context,
        reason,
        eventType: 'task_resumed',
        auditEventType: AUDIT_EVENT_TYPES.TASK_RESUMED,
        patch: {
          wait_reason: null,
          blocked_on_spawn_request_id: null,
          blocked_on_task_id: null,
          blocked_on_approval_request_id: null,
          lease_owner: null,
          lease_expires_at: null,
          wait_context_json: taskflow_wait_resume ? {
            taskflow_wait_resume,
          } : null,
        },
        auditPayload: {
          resumed_to_state: resumedState,
          taskflow_wait_resume_carrier: taskflow_wait_resume ? {
            carrier_kind: taskflow_wait_resume.carrier_kind,
            flow_id: taskflow_wait_resume.flow_id,
            current_step: taskflow_wait_resume.current_step,
            status: taskflow_wait_resume.status,
          } : null,
        },
      });
    },

    async cancelTask({ task_id, actor_context = {}, reason = null }) {
      return transitionTask({
        taskId: task_id,
        toState: TASK_STATES.CANCELLED,
        actorContext: actor_context,
        reason,
        eventType: 'task_cancelled',
        auditEventType: AUDIT_EVENT_TYPES.TASK_CANCELLED,
        patch: {
          cancelled_at: new Date().toISOString(),
          wait_reason: null,
          blocked_on_spawn_request_id: null,
          blocked_on_task_id: null,
          blocked_on_approval_request_id: null,
          lease_owner: null,
          lease_expires_at: null,
        },
      });
    },

    async failTask({ task_id, error_code = null, error_message = null, actor_context = {} }) {
      return transitionTask({
        taskId: task_id,
        toState: TASK_STATES.FAILED,
        actorContext: actor_context,
        eventType: 'task_failed',
        auditEventType: AUDIT_EVENT_TYPES.TASK_FAILED,
        auditPayload: {
          error_code,
          error_message,
        },
        patch: {
          error_code,
          error_message,
          failed_at: new Date().toISOString(),
          wait_reason: null,
          blocked_on_spawn_request_id: null,
          blocked_on_task_id: null,
          blocked_on_approval_request_id: null,
          lease_owner: null,
          lease_expires_at: null,
        },
      });
    },
  });
}

module.exports = {
  TASK_LIFECYCLE_SERVICE_CONTRACT,
  createTaskLifecycleService,
};
