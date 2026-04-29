// V1 control-plane operator run control service.
// This module provides a bounded operator-facing inspect/control layer over the accepted durable runtime shell and execution supervision services.
// It does not introduce background workers, autonomous loops, retry/recovery orchestration,
// broad runtime architecture, operator UI, or new governance semantics.

const { AUDIT_EVENT_TYPES } = require('../types/auditEventTypes');

const OPERATOR_RUN_CONTROL_ACTIONS = Object.freeze({
  INSPECT: 'inspect',
  RECORD_HEARTBEAT: 'record_heartbeat',
  MARK_MISSED_HEARTBEAT: 'mark_missed_heartbeat',
  EXPIRE_LEASE: 'expire_lease',
});

const OPERATOR_RUN_CONTROL_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'operatorRunControlService',
    service_role: 'bounded_operator_facing_run_inspect_and_control_mediator',
    ownership_rule: 'The service layer may expose bounded operator-triggered inspect/control actions over accepted runtime shell and supervision flows without replacing governance source-of-truth services.',
    forbidden_direct_mutators: Object.freeze([
      'repositories',
      'background_workers',
      'runtime_builders',
      'operator_ui_layers',
      'ad_hoc_unbounded_orchestration',
    ]),
  }),

  dependency_expectations: Object.freeze({
    repository_interfaces: Object.freeze([
      'durable runs repository',
      'tasks repository',
      'task events repository',
      'audit events repository',
    ]),
    durable_runtime_shell_service: 'Required for bounded run inspection semantics.',
    execution_supervision_service: 'Required for bounded manual control actions over supervised child execution.',
  }),

  implemented_methods: Object.freeze([
    'inspectOperatorRun',
    'recordOperatorHeartbeat',
    'markOperatorMissedHeartbeat',
    'expireOperatorLease',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'background worker loop',
    'autonomous control scheduler',
    'retry/recovery orchestration',
    'broad runtime shell redesign',
    'operator UI',
    'new governance semantics',
  ]),
});

function createOperatorRunControlService({
  repositories,
  durableRuntimeShellService,
  executionSupervisionService,
} = {}) {
  if (!repositories || !repositories.durableRuns || !repositories.tasks || !repositories.taskEvents || !repositories.auditEvents) {
    throw new Error('operatorRunControlService requires repositories.durableRuns, repositories.tasks, repositories.taskEvents, and repositories.auditEvents');
  }

  if (!durableRuntimeShellService
    || typeof durableRuntimeShellService.inspectDurableRun !== 'function'
    || typeof durableRuntimeShellService.getDurableRunById !== 'function') {
    throw new Error('operatorRunControlService requires durableRuntimeShellService.inspectDurableRun and durableRuntimeShellService.getDurableRunById');
  }

  if (!executionSupervisionService
    || typeof executionSupervisionService.recordExecutionHeartbeat !== 'function'
    || typeof executionSupervisionService.detectMissedHeartbeat !== 'function'
    || typeof executionSupervisionService.expireExecutionLease !== 'function') {
    throw new Error('operatorRunControlService requires executionSupervisionService bounded control methods');
  }

  async function loadParentTaskOrThrow(parent_task_id) {
    if (!parent_task_id) {
      throw new Error('operator run control requires parent_task_id');
    }

    const parentTask = await repositories.tasks.getTaskById({ task_id: parent_task_id });
    if (!parentTask) {
      throw new Error(`Parent task not found for operator run control: ${parent_task_id}`);
    }

    return parentTask;
  }

  async function appendOperatorControlTaskEvent({ parentTask, eventType, actorContext = {}, payload = {} }) {
    return repositories.taskEvents.appendTaskEvent({
      event: {
        event_id: payload.event_id || `${parentTask.task_id}:${eventType}:${Date.now()}`,
        task_id: parentTask.task_id,
        event_type: eventType,
        event_payload_json: {
          status: parentTask.status,
          actor_context: actorContext,
          ...payload,
        },
        created_at: payload.created_at || new Date().toISOString(),
        agent_id: parentTask.assigned_agent_id || null,
        idempotency_key: payload.idempotency_key || null,
      },
    });
  }

  async function appendOperatorControlAuditEvent({ parentTask, eventType, actorContext = {}, payload = {}, occurredAt = null }) {
    return repositories.auditEvents.appendAuditEvent({
      audit_event: {
        audit_event_id: payload.audit_event_id || `${parentTask.task_id}:${eventType}:${Date.now()}`,
        event_type: eventType,
        occurred_at: occurredAt || new Date().toISOString(),
        entity_type: 'task',
        entity_id: parentTask.task_id,
        root_task_id: parentTask.root_task_id || parentTask.task_id,
        related_task_id: payload.related_task_id || parentTask.task_id,
        related_agent_id: parentTask.assigned_agent_id || null,
        related_spawn_request_id: payload.related_spawn_request_id || null,
        related_approval_request_id: payload.related_approval_request_id || null,
        actor_type: actorContext.actor_type || 'operator',
        actor_id: actorContext.actor_id || 'operatorRunControlService',
        correlation_id: actorContext.correlation_id || payload.run_id,
        payload_summary: {
          task_status: parentTask.status,
          run_id: payload.run_id || null,
          control_action: payload.control_action || null,
          child_task_id: payload.child_task_id || null,
          lease_owner: payload.lease_owner || null,
          reason: payload.reason || null,
        },
        payload_ref: null,
        payload_detail_intent: 'bounded_operator_run_control_summary',
        append_only: true,
      },
    });
  }

  async function persistLastControlAction({ runEnvelope, controlAction, occurredAt = null }) {
    const durableRun = await repositories.durableRuns.updateDurableRunById({
      durable_run_id: runEnvelope.run_id,
      patch: {
        last_control_action: controlAction,
        last_control_at: occurredAt || new Date().toISOString(),
        updated_at: occurredAt || new Date().toISOString(),
      },
    });

    if (!durableRun) {
      throw new Error(`Persisted durable run not found for operator control update: ${runEnvelope.run_id}`);
    }

    return durableRuntimeShellService.getDurableRunById({ run_id: runEnvelope.run_id });
  }

  function buildOperatorVisibility({ runEnvelope, runSummary, childTask = null }) {
    return Object.freeze({
      run: Object.freeze({
        run_id: runSummary.run_id,
        run_status: runSummary.run_status,
        scenario_name: runSummary.scenario_name,
        invocation_name: runSummary.invocation_name,
        supervision_enabled: runSummary.supervision_enabled,
        opened_at: runSummary.opened_at,
        closed_at: runSummary.closed_at,
      }),
      linkage: Object.freeze({
        parent_task_id: runSummary.parent_task_id,
        child_task_id: runSummary.child_task_id,
        approved_spawn_request_id: runSummary.approved_spawn_request_id,
        approved_approval_request_id: runSummary.approved_approval_request_id,
        denied_spawn_request_id: runSummary.denied_spawn_request_id,
        denied_approval_request_id: runSummary.denied_approval_request_id,
      }),
      proof: Object.freeze({
        proof_flags: runSummary.proof_flags || null,
      }),
      supervision: Object.freeze({
        child_task_status: childTask ? childTask.status : null,
        lease_owner: childTask ? childTask.lease_owner || null : null,
        lease_expires_at: childTask ? childTask.lease_expires_at || null : null,
        heartbeat_at: childTask ? childTask.heartbeat_at || null : null,
      }),
      control_actions: Object.freeze([
        OPERATOR_RUN_CONTROL_ACTIONS.INSPECT,
        OPERATOR_RUN_CONTROL_ACTIONS.RECORD_HEARTBEAT,
        OPERATOR_RUN_CONTROL_ACTIONS.MARK_MISSED_HEARTBEAT,
        OPERATOR_RUN_CONTROL_ACTIONS.EXPIRE_LEASE,
      ]),
    });
  }

  async function inspectRunWithVisibility({ run_envelope, actor_context = {} }) {
    const persistedRunEnvelope = await durableRuntimeShellService.getDurableRunById({ run_id: run_envelope.run_id });
    const inspected = await durableRuntimeShellService.inspectDurableRun({
      run_envelope: persistedRunEnvelope || run_envelope,
      actor_context,
    });

    const parentTask = await loadParentTaskOrThrow(inspected.run.parent_task_id);
    const childTask = inspected.run.child_task_id
      ? await repositories.tasks.getTaskById({ task_id: inspected.run.child_task_id })
      : null;

    const visibility = buildOperatorVisibility({
      runEnvelope: inspected.run,
      runSummary: inspected.run_summary,
      childTask,
    });

    await appendOperatorControlTaskEvent({
      parentTask,
      eventType: 'operator_run_control_inspected',
      actorContext: actor_context,
      payload: {
        run_id: inspected.run.run_id,
        control_action: OPERATOR_RUN_CONTROL_ACTIONS.INSPECT,
        child_task_id: inspected.run.child_task_id || null,
      },
    });

    await appendOperatorControlAuditEvent({
      parentTask,
      eventType: AUDIT_EVENT_TYPES.OPERATOR_RUN_CONTROL_INSPECTED,
      actorContext: actor_context,
      payload: {
        run_id: inspected.run.run_id,
        control_action: OPERATOR_RUN_CONTROL_ACTIONS.INSPECT,
        child_task_id: inspected.run.child_task_id || null,
        related_task_id: inspected.run.child_task_id || parentTask.task_id,
        related_spawn_request_id: inspected.run.approved_spawn_request_id || null,
        related_approval_request_id: inspected.run.approved_approval_request_id || null,
        reason: 'bounded_operator_run_inspection',
      },
    });

    return Object.freeze({
      run: inspected.run,
      run_summary: inspected.run_summary,
      operator_visibility: visibility,
    });
  }

  return Object.freeze({
    async inspectOperatorRun({ run_envelope, actor_context = {} }) {
      if (!run_envelope || !run_envelope.run_id || !run_envelope.parent_task_id) {
        throw new Error('inspectOperatorRun requires run_envelope with run_id and parent_task_id');
      }

      return inspectRunWithVisibility({ run_envelope, actor_context });
    },

    async recordOperatorHeartbeat({
      run_envelope,
      lease_owner,
      heartbeat_at = null,
      lease_expires_at = null,
      actor_context = {},
    }) {
      if (!run_envelope || !run_envelope.run_id || !run_envelope.parent_task_id || !run_envelope.child_task_id) {
        throw new Error('recordOperatorHeartbeat requires run_envelope with run_id, parent_task_id, and child_task_id');
      }

      if (!lease_owner) {
        throw new Error('recordOperatorHeartbeat requires lease_owner');
      }

      const parentTask = await loadParentTaskOrThrow(run_envelope.parent_task_id);
      const heartbeatTask = await executionSupervisionService.recordExecutionHeartbeat({
        task_id: run_envelope.child_task_id,
        lease_owner,
        heartbeat_at,
        lease_expires_at,
        actor_context,
      });

      await appendOperatorControlTaskEvent({
        parentTask,
        eventType: 'operator_run_control_heartbeat_recorded',
        actorContext: actor_context,
        payload: {
          run_id: run_envelope.run_id,
          control_action: OPERATOR_RUN_CONTROL_ACTIONS.RECORD_HEARTBEAT,
          child_task_id: run_envelope.child_task_id,
          lease_owner,
          lease_expires_at: heartbeatTask.lease_expires_at || null,
        },
      });

      await appendOperatorControlAuditEvent({
        parentTask,
        eventType: AUDIT_EVENT_TYPES.OPERATOR_RUN_CONTROL_HEARTBEAT_RECORDED,
        actorContext: actor_context,
        payload: {
          run_id: run_envelope.run_id,
          control_action: OPERATOR_RUN_CONTROL_ACTIONS.RECORD_HEARTBEAT,
          child_task_id: run_envelope.child_task_id,
          related_task_id: run_envelope.child_task_id,
          related_spawn_request_id: run_envelope.approved_spawn_request_id || null,
          related_approval_request_id: run_envelope.approved_approval_request_id || null,
          lease_owner,
          reason: 'bounded_operator_recorded_execution_heartbeat',
        },
        occurredAt: heartbeatTask.updated_at || new Date().toISOString(),
      });

      const updatedRunEnvelope = await persistLastControlAction({
        runEnvelope: run_envelope,
        controlAction: OPERATOR_RUN_CONTROL_ACTIONS.RECORD_HEARTBEAT,
        occurredAt: heartbeatTask.updated_at || new Date().toISOString(),
      });

      return inspectRunWithVisibility({ run_envelope: updatedRunEnvelope, actor_context });
    },

    async markOperatorMissedHeartbeat({ run_envelope, actor_context = {} }) {
      if (!run_envelope || !run_envelope.run_id || !run_envelope.parent_task_id || !run_envelope.child_task_id) {
        throw new Error('markOperatorMissedHeartbeat requires run_envelope with run_id, parent_task_id, and child_task_id');
      }

      const parentTask = await loadParentTaskOrThrow(run_envelope.parent_task_id);
      await executionSupervisionService.detectMissedHeartbeat({
        task_id: run_envelope.child_task_id,
        actor_context,
      });

      await appendOperatorControlTaskEvent({
        parentTask,
        eventType: 'operator_run_control_missed_heartbeat_marked',
        actorContext: actor_context,
        payload: {
          run_id: run_envelope.run_id,
          control_action: OPERATOR_RUN_CONTROL_ACTIONS.MARK_MISSED_HEARTBEAT,
          child_task_id: run_envelope.child_task_id,
        },
      });

      await appendOperatorControlAuditEvent({
        parentTask,
        eventType: AUDIT_EVENT_TYPES.OPERATOR_RUN_CONTROL_MISSED_HEARTBEAT_MARKED,
        actorContext: actor_context,
        payload: {
          run_id: run_envelope.run_id,
          control_action: OPERATOR_RUN_CONTROL_ACTIONS.MARK_MISSED_HEARTBEAT,
          child_task_id: run_envelope.child_task_id,
          related_task_id: run_envelope.child_task_id,
          related_spawn_request_id: run_envelope.approved_spawn_request_id || null,
          related_approval_request_id: run_envelope.approved_approval_request_id || null,
          reason: 'bounded_operator_marked_missed_heartbeat',
        },
      });

      const updatedRunEnvelope = await persistLastControlAction({
        runEnvelope: run_envelope,
        controlAction: OPERATOR_RUN_CONTROL_ACTIONS.MARK_MISSED_HEARTBEAT,
      });

      return inspectRunWithVisibility({ run_envelope: updatedRunEnvelope, actor_context });
    },

    async expireOperatorLease({ run_envelope, actor_context = {} }) {
      if (!run_envelope || !run_envelope.run_id || !run_envelope.parent_task_id || !run_envelope.child_task_id) {
        throw new Error('expireOperatorLease requires run_envelope with run_id, parent_task_id, and child_task_id');
      }

      const parentTask = await loadParentTaskOrThrow(run_envelope.parent_task_id);
      const expiredTask = await executionSupervisionService.expireExecutionLease({
        task_id: run_envelope.child_task_id,
        actor_context,
      });

      await appendOperatorControlTaskEvent({
        parentTask,
        eventType: 'operator_run_control_lease_expired',
        actorContext: actor_context,
        payload: {
          run_id: run_envelope.run_id,
          control_action: OPERATOR_RUN_CONTROL_ACTIONS.EXPIRE_LEASE,
          child_task_id: run_envelope.child_task_id,
        },
      });

      await appendOperatorControlAuditEvent({
        parentTask,
        eventType: AUDIT_EVENT_TYPES.OPERATOR_RUN_CONTROL_LEASE_EXPIRED,
        actorContext: actor_context,
        payload: {
          run_id: run_envelope.run_id,
          control_action: OPERATOR_RUN_CONTROL_ACTIONS.EXPIRE_LEASE,
          child_task_id: run_envelope.child_task_id,
          related_task_id: run_envelope.child_task_id,
          related_spawn_request_id: run_envelope.approved_spawn_request_id || null,
          related_approval_request_id: run_envelope.approved_approval_request_id || null,
          reason: 'bounded_operator_expired_execution_lease',
        },
        occurredAt: expiredTask.updated_at || new Date().toISOString(),
      });

      const updatedRunEnvelope = await persistLastControlAction({
        runEnvelope: run_envelope,
        controlAction: OPERATOR_RUN_CONTROL_ACTIONS.EXPIRE_LEASE,
        occurredAt: expiredTask.updated_at || new Date().toISOString(),
      });

      return inspectRunWithVisibility({ run_envelope: updatedRunEnvelope, actor_context });
    },
  });
}

module.exports = {
  OPERATOR_RUN_CONTROL_ACTIONS,
  OPERATOR_RUN_CONTROL_SERVICE_CONTRACT,
  createOperatorRunControlService,
};
