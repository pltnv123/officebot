// V1 control-plane execution supervision service.
// This module provides bounded supervision primitives for the already accepted governed child execution path.
// It does not introduce background workers, autonomous loops, retry/recovery orchestration,
// broad runtime architecture, operator UI, or new governance semantics.

const { TASK_STATES, TERMINAL_TASK_STATES } = require('../types/taskStates');
const { SPAWN_REQUEST_STATES } = require('../types/spawnRequestStates');

const EXECUTION_SUPERVISION_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'executionSupervisionService',
    service_role: 'bounded_execution_supervision_mediator',
    ownership_rule: 'The service layer may mediate bounded lease, heartbeat, and expiry supervision for already accepted governed child execution only.',
    forbidden_direct_mutators: Object.freeze([
      'repositories',
      'routes',
      'background_workers',
      'runtime_builders',
      'ad_hoc_supervision_loops',
    ]),
  }),

  dependency_expectations: Object.freeze({
    repository_interfaces: Object.freeze([
      'tasks repository',
      'spawn requests repository',
    ]),
    task_lifecycle_service: 'Required for authoritative supervision-side task updates and append-only task/audit history.',
  }),

  implemented_methods: Object.freeze([
    'recordExecutionHeartbeat',
    'detectMissedHeartbeat',
    'expireExecutionLease',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'background worker loop',
    'autonomous supervision scheduler',
    'retry/recovery orchestration',
    'broad runtime shell redesign',
    'operator UI',
    'new governance semantics',
  ]),
});

function createExecutionSupervisionService({ repositories, taskLifecycleService } = {}) {
  if (!repositories || !repositories.tasks || !repositories.spawnRequests) {
    throw new Error('executionSupervisionService requires repositories.tasks and repositories.spawnRequests');
  }

  if (!taskLifecycleService
    || typeof taskLifecycleService.recordHeartbeat !== 'function'
    || typeof taskLifecycleService.markLeaseExpired !== 'function'
    || typeof taskLifecycleService.markHeartbeatMissed !== 'function') {
    throw new Error('executionSupervisionService requires taskLifecycleService supervision methods');
  }

  async function loadSupervisableGovernedChildTaskOrThrow({ task_id }) {
    if (!task_id) {
      throw new Error('execution supervision requires task_id');
    }

    const childTask = await repositories.tasks.getTaskById({ task_id });
    if (!childTask) {
      throw new Error(`Child task not found for supervision: ${task_id}`);
    }

    if (!childTask.input_payload_json || !childTask.input_payload_json.spawned_by_spawn_request_id) {
      throw new Error(`Task is not part of governed child execution lineage: ${task_id}`);
    }

    const spawnRequest = await repositories.spawnRequests.getSpawnRequestById({
      spawn_request_id: childTask.input_payload_json.spawned_by_spawn_request_id,
    });

    if (!spawnRequest) {
      throw new Error(`Spawn request not found for supervised task: ${task_id}`);
    }

    if (spawnRequest.status !== SPAWN_REQUEST_STATES.INSTANTIATED) {
      throw new Error(`Spawn request is not instantiated for supervised task: ${task_id}`);
    }

    if (spawnRequest.instantiated_task_id !== childTask.task_id) {
      throw new Error(`Spawn request linkage mismatch for supervised task: ${task_id}`);
    }

    return Object.freeze({
      childTask,
      spawnRequest,
    });
  }

  function ensureHeartbeatLeaseWindow({ childTask, heartbeat_at, lease_expires_at }) {
    const effectiveHeartbeatAt = heartbeat_at || new Date().toISOString();

    if (lease_expires_at && lease_expires_at < effectiveHeartbeatAt) {
      throw new Error(`Heartbeat lease_expires_at precedes heartbeat_at for task: ${childTask.task_id}`);
    }

    if (childTask.lease_expires_at && childTask.lease_expires_at < effectiveHeartbeatAt && !lease_expires_at) {
      throw new Error(`Heartbeat received after existing lease expiry for task: ${childTask.task_id}`);
    }

    return effectiveHeartbeatAt;
  }

  return Object.freeze({
    async recordExecutionHeartbeat({
      task_id,
      lease_owner,
      heartbeat_at = null,
      lease_expires_at = null,
      actor_context = {},
    }) {
      if (!lease_owner) {
        throw new Error('recordExecutionHeartbeat requires lease_owner');
      }

      const { childTask } = await loadSupervisableGovernedChildTaskOrThrow({ task_id });
      if (childTask.status !== TASK_STATES.RUNNING) {
        throw new Error(`Only running governed child tasks may record execution heartbeat: ${task_id}`);
      }

      const acceptedHeartbeatAt = ensureHeartbeatLeaseWindow({
        childTask,
        heartbeat_at,
        lease_expires_at,
      });

      return taskLifecycleService.recordHeartbeat({
        task_id,
        lease_owner,
        heartbeat_at: acceptedHeartbeatAt,
        lease_expires_at,
        actor_context,
      });
    },

    async detectMissedHeartbeat({
      task_id,
      detected_at = null,
      actor_context = {},
    }) {
      const { childTask } = await loadSupervisableGovernedChildTaskOrThrow({ task_id });

      if (TERMINAL_TASK_STATES.includes(childTask.status)) {
        throw new Error(`Terminal task may not enter missed-heartbeat supervision path: ${task_id}`);
      }

      if (!childTask.heartbeat_at) {
        throw new Error(`Supervised task has no heartbeat to evaluate: ${task_id}`);
      }

      return taskLifecycleService.markHeartbeatMissed({
        task_id,
        detected_at,
        actor_context,
      });
    },

    async expireExecutionLease({
      task_id,
      detected_at = null,
      actor_context = {},
    }) {
      const { childTask } = await loadSupervisableGovernedChildTaskOrThrow({ task_id });

      if (TERMINAL_TASK_STATES.includes(childTask.status)) {
        throw new Error(`Terminal task may not enter lease-expiry supervision path: ${task_id}`);
      }

      if (!childTask.lease_owner && !childTask.lease_expires_at) {
        throw new Error(`Supervised task has no active lease to expire: ${task_id}`);
      }

      return taskLifecycleService.markLeaseExpired({
        task_id,
        detected_at,
        actor_context,
      });
    },
  });
}

module.exports = {
  EXECUTION_SUPERVISION_SERVICE_CONTRACT,
  createExecutionSupervisionService,
};
