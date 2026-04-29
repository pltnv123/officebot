// V1 control-plane child execution service.
// This module realizes only the bounded child execution/progress/completion path.
// No merge-back behavior, parent resume behavior, background worker loop,
// broad runtime architecture, API wiring, or server authority belongs here.

const { TASK_STATES } = require('../types/taskStates');
const { SPAWN_REQUEST_STATES } = require('../types/spawnRequestStates');
const { TRANSITION_GUARD_CONTRACT } = require('../domain/transitionGuards');

const CHILD_EXECUTION_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'childExecutionService',
    service_role: 'bounded_child_execution_mediator',
    ownership_rule: 'The service layer is the only allowed mediator of governed child execution progression in v1.',
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
      'spawn requests repository',
    ]),
    task_lifecycle_service: 'Required for authoritative task lifecycle transitions and append-only task/audit history.',
    transition_guard_contract: 'Required for validating bounded child execution state expectations before lifecycle progression.',
  }),

  implemented_methods: Object.freeze([
    'startChildExecution',
    'recordChildProgress',
    'completeChildExecution',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'merge_back behavior',
    'parent resume behavior',
    'background worker loop',
    'broad executor/runtime architecture',
    'API/runtime wiring expansion',
  ]),
});

function createChildExecutionService({ repositories, taskLifecycleService, transitionGuardContract = TRANSITION_GUARD_CONTRACT } = {}) {
  if (!repositories || !repositories.tasks || !repositories.spawnRequests) {
    throw new Error('childExecutionService requires repositories.tasks and repositories.spawnRequests');
  }

  if (!taskLifecycleService
    || typeof taskLifecycleService.markTaskReady !== 'function'
    || typeof taskLifecycleService.claimTask !== 'function'
    || typeof taskLifecycleService.startTask !== 'function'
    || typeof taskLifecycleService.recordCheckpoint !== 'function'
    || typeof taskLifecycleService.completeTask !== 'function') {
    throw new Error('childExecutionService requires taskLifecycleService lifecycle and checkpoint methods');
  }

  const taskTransitions = transitionGuardContract.task_state_transitions || {};

  function ensureTransitionAllowed(fromState, toState) {
    const allowedNextStates = taskTransitions[fromState] || [];
    if (!allowedNextStates.includes(toState)) {
      throw new Error(`Illegal child task transition: ${fromState} -> ${toState}`);
    }
  }

  async function loadGovernedChildTaskOrThrow({ task_id }) {
    if (!task_id) {
      throw new Error('child execution requires task_id');
    }

    const childTask = await repositories.tasks.getTaskById({ task_id });
    if (!childTask) {
      throw new Error(`Child task not found: ${task_id}`);
    }

    const spawnedBySpawnRequestId = childTask.input_payload_json && childTask.input_payload_json.spawned_by_spawn_request_id;
    if (!spawnedBySpawnRequestId) {
      throw new Error(`Task does not belong to governed spawn lineage: ${task_id}`);
    }

    const spawnRequest = await repositories.spawnRequests.getSpawnRequestById({
      spawn_request_id: spawnedBySpawnRequestId,
    });

    if (!spawnRequest) {
      throw new Error(`Spawn request not found for child task: ${task_id}`);
    }

    if (spawnRequest.status !== SPAWN_REQUEST_STATES.INSTANTIATED) {
      throw new Error(`Spawn request is not instantiated for child task: ${task_id}`);
    }

    if (spawnRequest.instantiated_task_id !== childTask.task_id) {
      throw new Error(`Spawn request child linkage mismatch for task: ${task_id}`);
    }

    if (childTask.parent_task_id !== spawnRequest.parent_task_id) {
      throw new Error(`Child task parent lineage mismatch for task: ${task_id}`);
    }

    return Object.freeze({
      childTask,
      spawnRequest,
    });
  }

  return Object.freeze({
    async startChildExecution({ task_id, lease_owner, lease_expires_at = null, actor_context = {} }) {
      if (!lease_owner) {
        throw new Error('startChildExecution requires lease_owner');
      }

      const { childTask } = await loadGovernedChildTaskOrThrow({ task_id });

      ensureTransitionAllowed(childTask.status, TASK_STATES.READY);
      const readyTask = await taskLifecycleService.markTaskReady({
        task_id,
        actor_context,
        reason: 'governed_child_execution_ready',
      });

      ensureTransitionAllowed(readyTask.status, TASK_STATES.CLAIMED);
      const claimedTask = await taskLifecycleService.claimTask({
        task_id,
        lease_owner,
        lease_expires_at,
        actor_context,
      });

      ensureTransitionAllowed(claimedTask.status, TASK_STATES.RUNNING);
      const runningTask = await taskLifecycleService.startTask({
        task_id,
        actor_context,
      });

      return Object.freeze({
        child_task: runningTask,
      });
    },

    async recordChildProgress({
      task_id,
      checkpoint_id,
      checkpoint_kind,
      checkpoint_payload_json,
      created_by,
      agent_id = null,
      actor_context = {},
    }) {
      const { childTask } = await loadGovernedChildTaskOrThrow({ task_id });

      if (childTask.status !== TASK_STATES.RUNNING) {
        throw new Error(`Child task is not running: ${task_id}`);
      }

      return taskLifecycleService.recordCheckpoint({
        task_id,
        checkpoint_id,
        checkpoint_kind,
        checkpoint_payload_json,
        created_by,
        agent_id,
        actor_context,
      });
    },

    async completeChildExecution({ task_id, result_payload_json = null, actor_context = {} }) {
      const { childTask } = await loadGovernedChildTaskOrThrow({ task_id });

      if (childTask.status !== TASK_STATES.RUNNING) {
        throw new Error(`Child task is not running: ${task_id}`);
      }

      const completedTask = await taskLifecycleService.completeTask({
        task_id,
        result_payload_json,
        actor_context,
      });

      return Object.freeze({
        child_task: completedTask,
      });
    },
  });
}

module.exports = {
  CHILD_EXECUTION_SERVICE_CONTRACT,
  createChildExecutionService,
};
