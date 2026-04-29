// V1 control-plane durable runtime shell service.
// This module provides one bounded durable run envelope around the accepted operator invocation and execution supervision layers.
// It does not introduce background workers, autonomous loops, retry/recovery orchestration,
// broad runtime architecture, operator UI, or new governance semantics.

const { AUDIT_EVENT_TYPES } = require('../types/auditEventTypes');

const RUNTIME_SHELL_RUN_STATUSES = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
});

const DURABLE_RUNTIME_SHELL_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'durableRuntimeShellService',
    service_role: 'bounded_durable_runtime_run_envelope_mediator',
    ownership_rule: 'The service layer may create one explicit durable run envelope around already accepted invocation and supervision flows without replacing governance source-of-truth services.',
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
    operator_invocation_harness_service: 'Required for bounded governed demo invocation.',
    execution_supervision_service: 'Optional bounded supervision dependency for shell context linkage only.',
  }),

  implemented_methods: Object.freeze([
    'openDurableRun',
    'inspectDurableRun',
    'closeDurableRun',
    'getDurableRunById',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'background worker loop',
    'autonomous runtime scheduler',
    'retry/recovery orchestration',
    'multi-run orchestration substrate',
    'operator UI',
    'new governance semantics',
  ]),
});

function createDurableRuntimeShellService({
  repositories,
  operatorInvocationHarnessService,
  executionSupervisionService = null,
} = {}) {
  if (!repositories || !repositories.durableRuns || !repositories.tasks || !repositories.taskEvents || !repositories.auditEvents) {
    throw new Error('durableRuntimeShellService requires repositories.durableRuns, repositories.tasks, repositories.taskEvents, and repositories.auditEvents');
  }

  if (!operatorInvocationHarnessService
    || typeof operatorInvocationHarnessService.getInvocationContract !== 'function'
    || typeof operatorInvocationHarnessService.invokeGovernedDemoScenario !== 'function') {
    throw new Error('durableRuntimeShellService requires operatorInvocationHarnessService contract and invocation methods');
  }

  if (executionSupervisionService) {
    const hasSupervisionShape = typeof executionSupervisionService.recordExecutionHeartbeat === 'function'
      && typeof executionSupervisionService.detectMissedHeartbeat === 'function'
      && typeof executionSupervisionService.expireExecutionLease === 'function';

    if (!hasSupervisionShape) {
      throw new Error('durableRuntimeShellService executionSupervisionService must expose bounded supervision methods when provided');
    }
  }

  async function loadParentTaskOrThrow(parent_task_id) {
    if (!parent_task_id) {
      throw new Error('durable runtime shell requires parent_task_id');
    }

    const parentTask = await repositories.tasks.getTaskById({ task_id: parent_task_id });
    if (!parentTask) {
      throw new Error(`Parent task not found for durable runtime shell: ${parent_task_id}`);
    }

    return parentTask;
  }

  async function appendRuntimeShellTaskEvent({ parentTask, eventType, actorContext = {}, payload = {} }) {
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

  async function appendRuntimeShellAuditEvent({ parentTask, eventType, actorContext = {}, payload = {}, occurredAt = null }) {
    return repositories.auditEvents.appendAuditEvent({
      audit_event: {
        audit_event_id: payload.audit_event_id || `${parentTask.task_id}:${eventType}:${Date.now()}`,
        event_type: eventType,
        occurred_at: occurredAt || new Date().toISOString(),
        entity_type: 'task',
        entity_id: parentTask.task_id,
        root_task_id: parentTask.root_task_id || parentTask.task_id,
        related_task_id: parentTask.task_id,
        related_agent_id: parentTask.assigned_agent_id || null,
        related_spawn_request_id: payload.related_spawn_request_id || parentTask.blocked_on_spawn_request_id || null,
        related_approval_request_id: payload.related_approval_request_id || parentTask.blocked_on_approval_request_id || null,
        actor_type: actorContext.actor_type || 'system',
        actor_id: actorContext.actor_id || 'durableRuntimeShellService',
        correlation_id: actorContext.correlation_id || payload.run_id,
        payload_summary: {
          task_status: parentTask.status,
          run_id: payload.run_id,
          run_status: payload.run_status,
          invocation_name: payload.invocation_name || null,
          reason: payload.reason || null,
        },
        payload_ref: null,
        payload_detail_intent: 'bounded_runtime_shell_run_summary',
        append_only: true,
      },
    });
  }

  function normalizeDurableRunRecord(durableRun) {
    if (!durableRun) {
      return null;
    }

    return Object.freeze({
      run_id: durableRun.durable_run_id,
      run_status: durableRun.run_status,
      parent_task_id: durableRun.parent_task_id,
      root_task_id: durableRun.root_task_id,
      invocation_name: durableRun.invocation_name,
      scenario_name: durableRun.scenario_name,
      opened_at: durableRun.opened_at,
      closed_at: durableRun.closed_at || null,
      supervision_enabled: Boolean(durableRun.supervision_enabled),
      approved_spawn_request_id: durableRun.approved_spawn_request_id || null,
      approved_approval_request_id: durableRun.approved_approval_request_id || null,
      child_task_id: durableRun.child_task_id || null,
      denied_spawn_request_id: durableRun.denied_spawn_request_id || null,
      denied_approval_request_id: durableRun.denied_approval_request_id || null,
      proof_flags: durableRun.proof_summary_json || null,
      last_control_action: durableRun.last_control_action || null,
      last_control_at: durableRun.last_control_at || null,
      created_at: durableRun.created_at,
      updated_at: durableRun.updated_at,
    });
  }

  function buildRunSummary({ runEnvelope, walkthroughResult = null, proofBundle = null }) {
    return Object.freeze({
      run_id: runEnvelope.run_id,
      run_status: runEnvelope.run_status,
      parent_task_id: runEnvelope.parent_task_id,
      root_task_id: runEnvelope.root_task_id,
      scenario_name: runEnvelope.scenario_name,
      invocation_name: runEnvelope.invocation_name,
      opened_at: runEnvelope.opened_at,
      closed_at: runEnvelope.closed_at || null,
      supervision_enabled: runEnvelope.supervision_enabled,
      approved_spawn_request_id: walkthroughResult ? walkthroughResult.approve_branch.approved.spawn_request.spawn_request_id : runEnvelope.approved_spawn_request_id || null,
      approved_approval_request_id: walkthroughResult ? walkthroughResult.approve_branch.approved.approval_request.approval_request_id : runEnvelope.approved_approval_request_id || null,
      child_task_id: walkthroughResult ? walkthroughResult.approve_branch.completed_child.child_task.task_id : runEnvelope.child_task_id || null,
      denied_spawn_request_id: walkthroughResult ? walkthroughResult.deny_branch.denied.spawn_request.spawn_request_id : runEnvelope.denied_spawn_request_id || null,
      denied_approval_request_id: walkthroughResult ? walkthroughResult.deny_branch.denied.approval_request.approval_request_id : runEnvelope.denied_approval_request_id || null,
      proof_flags: proofBundle ? proofBundle.proof_summary : runEnvelope.proof_flags || null,
      last_control_action: runEnvelope.last_control_action || null,
      last_control_at: runEnvelope.last_control_at || null,
      created_at: runEnvelope.created_at || runEnvelope.opened_at,
      updated_at: runEnvelope.updated_at || runEnvelope.closed_at || runEnvelope.opened_at,
    });
  }

  function createRunEnvelope({ run_id, parent_task_id, actor_context, invocation_contract }) {
    const now = new Date().toISOString();
    return Object.freeze({
      run_id,
      run_status: RUNTIME_SHELL_RUN_STATUSES.OPEN,
      parent_task_id,
      root_task_id: actor_context.root_task_id || parent_task_id,
      invocation_name: invocation_contract.invocation.invocation_name,
      scenario_name: invocation_contract.scenario.scenario_name,
      opened_at: now,
      closed_at: null,
      supervision_enabled: Boolean(executionSupervisionService),
      approved_spawn_request_id: null,
      approved_approval_request_id: null,
      child_task_id: null,
      denied_spawn_request_id: null,
      denied_approval_request_id: null,
      proof_flags: null,
      last_control_action: null,
      last_control_at: null,
      created_at: now,
      updated_at: now,
    });
  }

  function buildDurableRunRecordFromEnvelope(runEnvelope) {
    return Object.freeze({
      durable_run_id: runEnvelope.run_id,
      parent_task_id: runEnvelope.parent_task_id,
      root_task_id: runEnvelope.root_task_id,
      run_status: runEnvelope.run_status,
      invocation_name: runEnvelope.invocation_name,
      scenario_name: runEnvelope.scenario_name,
      supervision_enabled: runEnvelope.supervision_enabled,
      opened_at: runEnvelope.opened_at,
      closed_at: runEnvelope.closed_at || null,
      approved_spawn_request_id: runEnvelope.approved_spawn_request_id || null,
      approved_approval_request_id: runEnvelope.approved_approval_request_id || null,
      child_task_id: runEnvelope.child_task_id || null,
      denied_spawn_request_id: runEnvelope.denied_spawn_request_id || null,
      denied_approval_request_id: runEnvelope.denied_approval_request_id || null,
      proof_summary_json: runEnvelope.proof_flags || null,
      last_control_action: runEnvelope.last_control_action || null,
      last_control_at: runEnvelope.last_control_at || null,
      created_at: runEnvelope.created_at || runEnvelope.opened_at,
      updated_at: runEnvelope.updated_at || runEnvelope.opened_at,
    });
  }

  async function persistNewDurableRun({ runEnvelope }) {
    const persistedRun = await repositories.durableRuns.createDurableRun({
      durable_run: buildDurableRunRecordFromEnvelope(runEnvelope),
    });

    return normalizeDurableRunRecord(persistedRun);
  }

  async function updatePersistedDurableRun({ runEnvelope }) {
    const persistedRun = await repositories.durableRuns.updateDurableRunById({
      durable_run_id: runEnvelope.run_id,
      patch: {
        root_task_id: runEnvelope.root_task_id,
        run_status: runEnvelope.run_status,
        invocation_name: runEnvelope.invocation_name,
        scenario_name: runEnvelope.scenario_name,
        supervision_enabled: runEnvelope.supervision_enabled,
        opened_at: runEnvelope.opened_at,
        closed_at: runEnvelope.closed_at || null,
        approved_spawn_request_id: runEnvelope.approved_spawn_request_id || null,
        approved_approval_request_id: runEnvelope.approved_approval_request_id || null,
        child_task_id: runEnvelope.child_task_id || null,
        denied_spawn_request_id: runEnvelope.denied_spawn_request_id || null,
        denied_approval_request_id: runEnvelope.denied_approval_request_id || null,
        proof_summary_json: runEnvelope.proof_flags || null,
        last_control_action: runEnvelope.last_control_action || null,
        last_control_at: runEnvelope.last_control_at || null,
        updated_at: runEnvelope.updated_at || new Date().toISOString(),
      },
    });

    if (!persistedRun) {
      throw new Error(`Persisted durable run not found for update: ${runEnvelope.run_id}`);
    }

    return normalizeDurableRunRecord(persistedRun);
  }

  return Object.freeze({
    async openDurableRun({
      run_id,
      parent_task_id,
      approve_branch,
      deny_branch,
      actor_context = {},
    }) {
      if (!run_id) {
        throw new Error('openDurableRun requires run_id');
      }

      const parentTask = await loadParentTaskOrThrow(parent_task_id);
      const invocation_contract = operatorInvocationHarnessService.getInvocationContract();
      const runEnvelope = await persistNewDurableRun({
        runEnvelope: createRunEnvelope({
          run_id,
          parent_task_id,
          actor_context,
          invocation_contract,
        }),
      });

      await appendRuntimeShellTaskEvent({
        parentTask,
        eventType: 'runtime_shell_run_started',
        actorContext: actor_context,
        payload: {
          run_id,
          run_status: runEnvelope.run_status,
          invocation_name: runEnvelope.invocation_name,
          scenario_name: runEnvelope.scenario_name,
          supervision_enabled: runEnvelope.supervision_enabled,
          created_at: runEnvelope.opened_at,
        },
      });

      await appendRuntimeShellAuditEvent({
        parentTask,
        eventType: AUDIT_EVENT_TYPES.RUNTIME_SHELL_RUN_STARTED,
        actorContext: actor_context,
        payload: {
          run_id,
          run_status: runEnvelope.run_status,
          invocation_name: runEnvelope.invocation_name,
          reason: 'bounded_durable_runtime_shell_opened',
        },
        occurredAt: runEnvelope.opened_at,
      });

      const invocationResult = await operatorInvocationHarnessService.invokeGovernedDemoScenario({
        parent_task_id,
        approve_branch,
        deny_branch,
        actor_context: {
          ...actor_context,
          actor_id: actor_context.actor_id || 'durableRuntimeShellService',
          correlation_id: actor_context.correlation_id || run_id,
          durable_run_id: run_id,
        },
      });

      const closedAt = new Date().toISOString();
      const closedRunEnvelope = await updatePersistedDurableRun({
        runEnvelope: Object.freeze({
          ...runEnvelope,
          run_status: RUNTIME_SHELL_RUN_STATUSES.CLOSED,
          closed_at: closedAt,
          approved_spawn_request_id: invocationResult.walkthrough_result.approve_branch.approved.spawn_request.spawn_request_id,
          approved_approval_request_id: invocationResult.walkthrough_result.approve_branch.approved.approval_request.approval_request_id,
          child_task_id: invocationResult.walkthrough_result.approve_branch.completed_child.child_task.task_id,
          denied_spawn_request_id: invocationResult.walkthrough_result.deny_branch.denied.spawn_request.spawn_request_id,
          denied_approval_request_id: invocationResult.walkthrough_result.deny_branch.denied.approval_request.approval_request_id,
          proof_flags: invocationResult.proof_bundle.proof_summary,
          updated_at: closedAt,
        }),
      });

      await appendRuntimeShellTaskEvent({
        parentTask,
        eventType: 'runtime_shell_run_closed',
        actorContext: actor_context,
        payload: {
          run_id,
          run_status: closedRunEnvelope.run_status,
          invocation_name: closedRunEnvelope.invocation_name,
          scenario_name: closedRunEnvelope.scenario_name,
          supervision_enabled: closedRunEnvelope.supervision_enabled,
          approved_spawn_request_id: closedRunEnvelope.approved_spawn_request_id,
          child_task_id: closedRunEnvelope.child_task_id,
          denied_spawn_request_id: closedRunEnvelope.denied_spawn_request_id,
          created_at: closedRunEnvelope.closed_at,
        },
      });

      await appendRuntimeShellAuditEvent({
        parentTask,
        eventType: AUDIT_EVENT_TYPES.RUNTIME_SHELL_RUN_CLOSED,
        actorContext: actor_context,
        payload: {
          run_id,
          run_status: closedRunEnvelope.run_status,
          invocation_name: closedRunEnvelope.invocation_name,
          related_spawn_request_id: closedRunEnvelope.approved_spawn_request_id,
          reason: 'bounded_durable_runtime_shell_closed',
        },
        occurredAt: closedRunEnvelope.closed_at,
      });

      return Object.freeze({
        run: closedRunEnvelope,
        run_summary: buildRunSummary({
          runEnvelope: closedRunEnvelope,
          walkthroughResult: invocationResult.walkthrough_result,
          proofBundle: invocationResult.proof_bundle,
        }),
        invocation_result: invocationResult,
      });
    },

    async inspectDurableRun({ run_envelope, actor_context = {} }) {
      if (!run_envelope || !run_envelope.run_id || !run_envelope.parent_task_id) {
        throw new Error('inspectDurableRun requires run_envelope with run_id and parent_task_id');
      }

      const persistedRun = await repositories.durableRuns.getDurableRunById({ durable_run_id: run_envelope.run_id });
      const effectiveRunEnvelope = normalizeDurableRunRecord(persistedRun) || run_envelope;
      const parentTask = await loadParentTaskOrThrow(effectiveRunEnvelope.parent_task_id);
      const runSummary = buildRunSummary({ runEnvelope: effectiveRunEnvelope });

      await appendRuntimeShellTaskEvent({
        parentTask,
        eventType: 'runtime_shell_run_inspected',
        actorContext: actor_context,
        payload: {
          run_id: effectiveRunEnvelope.run_id,
          run_status: effectiveRunEnvelope.run_status,
          invocation_name: effectiveRunEnvelope.invocation_name,
          scenario_name: effectiveRunEnvelope.scenario_name,
        },
      });

      await appendRuntimeShellAuditEvent({
        parentTask,
        eventType: AUDIT_EVENT_TYPES.RUNTIME_SHELL_RUN_INSPECTED,
        actorContext: actor_context,
        payload: {
          run_id: effectiveRunEnvelope.run_id,
          run_status: effectiveRunEnvelope.run_status,
          invocation_name: effectiveRunEnvelope.invocation_name,
          related_spawn_request_id: effectiveRunEnvelope.approved_spawn_request_id || null,
          reason: 'bounded_durable_runtime_shell_inspected',
        },
      });

      return Object.freeze({
        run: effectiveRunEnvelope,
        run_summary: runSummary,
      });
    },

    async closeDurableRun({ run_envelope, actor_context = {}, reason = 'bounded_runtime_shell_close_confirmation' }) {
      if (!run_envelope || !run_envelope.run_id || !run_envelope.parent_task_id) {
        throw new Error('closeDurableRun requires run_envelope with run_id and parent_task_id');
      }

      const parentTask = await loadParentTaskOrThrow(run_envelope.parent_task_id);
      const closedAt = run_envelope.closed_at || new Date().toISOString();
      const closedRunEnvelope = await updatePersistedDurableRun({
        runEnvelope: Object.freeze({
          ...run_envelope,
          run_status: RUNTIME_SHELL_RUN_STATUSES.CLOSED,
          closed_at: closedAt,
          updated_at: closedAt,
        }),
      });

      await appendRuntimeShellTaskEvent({
        parentTask,
        eventType: 'runtime_shell_run_closed',
        actorContext: actor_context,
        payload: {
          run_id: closedRunEnvelope.run_id,
          run_status: closedRunEnvelope.run_status,
          invocation_name: closedRunEnvelope.invocation_name,
          scenario_name: closedRunEnvelope.scenario_name,
          created_at: closedRunEnvelope.closed_at,
          reason,
        },
      });

      await appendRuntimeShellAuditEvent({
        parentTask,
        eventType: AUDIT_EVENT_TYPES.RUNTIME_SHELL_RUN_CLOSED,
        actorContext: actor_context,
        payload: {
          run_id: closedRunEnvelope.run_id,
          run_status: closedRunEnvelope.run_status,
          invocation_name: closedRunEnvelope.invocation_name,
          related_spawn_request_id: closedRunEnvelope.approved_spawn_request_id || null,
          reason,
        },
        occurredAt: closedRunEnvelope.closed_at,
      });

      return Object.freeze({
        run: closedRunEnvelope,
        run_summary: buildRunSummary({ runEnvelope: closedRunEnvelope }),
      });
    },

    async getDurableRunById({ run_id }) {
      if (!run_id) {
        throw new Error('getDurableRunById requires run_id');
      }

      const durableRun = await repositories.durableRuns.getDurableRunById({ durable_run_id: run_id });
      return normalizeDurableRunRecord(durableRun);
    },
  });
}

module.exports = {
  RUNTIME_SHELL_RUN_STATUSES,
  DURABLE_RUNTIME_SHELL_SERVICE_CONTRACT,
  createDurableRuntimeShellService,
};
