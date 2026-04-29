// V1 control-plane parent/child coordination service.
// This module realizes only the bounded parent waiting_for_child, merge-back,
// and post-merge parent resume mediation paths.
// No child execution, checkpoints/heartbeats runtime handling beyond bounded coordination,
// executor integration, API wiring, or runtime builder authority belongs here.

const { TASK_STATES } = require('../types/taskStates');
const { SPAWN_REQUEST_STATES } = require('../types/spawnRequestStates');
const { TRANSITION_GUARD_CONTRACT } = require('../domain/transitionGuards');

const PARENT_CHILD_COORDINATION_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'parentChildCoordinationService',
    service_role: 'bounded_parent_waiting_for_child_mediator',
    ownership_rule: 'The service layer is the only allowed mediator of parent waiting_for_child coordination in v1.',
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
      'spawn requests repository',
      'tasks repository',
    ]),
    task_lifecycle_service: 'Required for authoritative parent task state mediation, bounded merge-back recording, and explicit post-merge parent resume.',
    transition_guard_contract: 'Required for validating bounded spawn_request/task state expectations before coordination.',
  }),

  implemented_methods: Object.freeze([
    'enterParentWaitingForChild',
    'mergeCompletedChildResultIntoParent',
    'resumeParentAfterChildMerge',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'child execution loop',
    'checkpoints/heartbeats/progress handling',
    'child completion handling beyond bounded merge result capture',
    'retry/recovery orchestration',
    'executor loop integration',
    'API/runtime wiring',
  ]),
});

function createParentChildCoordinationService({ repositories, taskLifecycleService, transitionGuardContract = TRANSITION_GUARD_CONTRACT } = {}) {
  if (!repositories || !repositories.spawnRequests || !repositories.tasks) {
    throw new Error('parentChildCoordinationService requires repositories.spawnRequests and repositories.tasks');
  }

  if (!taskLifecycleService
    || typeof taskLifecycleService.waitForChild !== 'function'
    || typeof taskLifecycleService.recordChildResultMerge !== 'function'
    || typeof taskLifecycleService.resumeTask !== 'function') {
    throw new Error('parentChildCoordinationService requires taskLifecycleService.waitForChild, taskLifecycleService.recordChildResultMerge, and taskLifecycleService.resumeTask');
  }

  const taskTransitions = transitionGuardContract.task_state_transitions || {};

  function ensureParentMayWaitForChild(fromState) {
    const allowedNextStates = taskTransitions[fromState] || [];
    if (!allowedNextStates.includes(TASK_STATES.WAITING_FOR_CHILD)) {
      throw new Error(`Parent task may not enter waiting_for_child from state: ${fromState}`);
    }
  }

  async function loadInstantiatedSpawnOrThrow({ spawn_request_id, errorPrefix = 'coordination' }) {
    if (!spawn_request_id) {
      throw new Error(`${errorPrefix} requires spawn_request_id`);
    }

    const spawnRequest = await repositories.spawnRequests.getSpawnRequestById({ spawn_request_id });
    if (!spawnRequest) {
      throw new Error(`Spawn request not found: ${spawn_request_id}`);
    }

    if (spawnRequest.status !== SPAWN_REQUEST_STATES.INSTANTIATED) {
      throw new Error(`Spawn request is not instantiated: ${spawn_request_id}`);
    }

    if (!spawnRequest.parent_task_id) {
      throw new Error(`Instantiated spawn_request is missing parent_task_id: ${spawn_request_id}`);
    }

    if (!spawnRequest.instantiated_task_id) {
      throw new Error(`Instantiated spawn_request is missing instantiated_task_id: ${spawn_request_id}`);
    }

    return spawnRequest;
  }

  async function loadCompletedGovernedChildContextOrThrow({ child_task_id }) {
    if (!child_task_id) {
      throw new Error('mergeCompletedChildResultIntoParent requires child_task_id');
    }

    const childTask = await repositories.tasks.getTaskById({ task_id: child_task_id });
    if (!childTask) {
      throw new Error(`Child task not found: ${child_task_id}`);
    }

    if (childTask.status !== TASK_STATES.COMPLETED) {
      throw new Error(`Child task is not completed: ${child_task_id}`);
    }

    const spawnedBySpawnRequestId = childTask.input_payload_json && childTask.input_payload_json.spawned_by_spawn_request_id;
    if (!spawnedBySpawnRequestId) {
      throw new Error(`Child task does not belong to governed spawn lineage: ${child_task_id}`);
    }

    const spawnRequest = await loadInstantiatedSpawnOrThrow({
      spawn_request_id: spawnedBySpawnRequestId,
      errorPrefix: 'mergeCompletedChildResultIntoParent',
    });

    if (spawnRequest.instantiated_task_id !== childTask.task_id) {
      throw new Error(`Spawn request child linkage mismatch for merge-back: ${child_task_id}`);
    }

    const parentTask = await repositories.tasks.getTaskById({ task_id: spawnRequest.parent_task_id });
    if (!parentTask) {
      throw new Error(`Parent task not found for child merge-back: ${child_task_id}`);
    }

    if (parentTask.status !== TASK_STATES.WAITING_FOR_CHILD) {
      throw new Error(`Parent task is not waiting_for_child for merge-back: ${parentTask.task_id}`);
    }

    if (parentTask.blocked_on_spawn_request_id !== spawnRequest.spawn_request_id) {
      throw new Error(`Parent task blocked_on_spawn_request_id mismatch for merge-back: ${parentTask.task_id}`);
    }

    if (parentTask.blocked_on_task_id !== childTask.task_id) {
      throw new Error(`Parent task blocked_on_task_id mismatch for merge-back: ${parentTask.task_id}`);
    }

    return Object.freeze({
      childTask,
      spawnRequest,
      parentTask,
    });
  }

  async function loadWaitingParentTaskByIdOrThrow({ parent_task_id }) {
    if (!parent_task_id) {
      throw new Error('resumeParentAfterChildMerge requires parent_task_id');
    }

    const parentTask = await repositories.tasks.getTaskById({ task_id: parent_task_id });
    if (!parentTask) {
      throw new Error(`Parent task not found: ${parent_task_id}`);
    }

    if (parentTask.status !== TASK_STATES.WAITING_FOR_CHILD) {
      throw new Error(`Parent task is not waiting_for_child: ${parent_task_id}`);
    }

    if (parentTask.wait_reason !== TASK_STATES.WAITING_FOR_CHILD) {
      throw new Error(`Parent task wait_reason is not waiting_for_child: ${parent_task_id}`);
    }

    if (!parentTask.blocked_on_spawn_request_id) {
      throw new Error(`Parent task is missing blocked_on_spawn_request_id: ${parent_task_id}`);
    }

    if (!parentTask.blocked_on_task_id) {
      throw new Error(`Parent task is missing blocked_on_task_id: ${parent_task_id}`);
    }

    return parentTask;
  }

  return Object.freeze({
    async enterParentWaitingForChild({ spawn_request_id, actor_context = {}, reason = null }) {
      const spawnRequest = await loadInstantiatedSpawnOrThrow({
        spawn_request_id,
        errorPrefix: 'enterParentWaitingForChild',
      });

      const parentTask = await repositories.tasks.getTaskById({ task_id: spawnRequest.parent_task_id });
      if (!parentTask) {
        throw new Error(`Parent task not found for spawn_request: ${spawn_request_id}`);
      }

      ensureParentMayWaitForChild(parentTask.status);

      const waitingParentTask = await taskLifecycleService.waitForChild({
        task_id: spawnRequest.parent_task_id,
        spawn_request_id: spawnRequest.spawn_request_id,
        child_task_id: spawnRequest.instantiated_task_id,
        actor_context,
        reason,
      });

      if (waitingParentTask.blocked_on_spawn_request_id !== spawnRequest.spawn_request_id) {
        throw new Error(`Parent waiting linkage mismatch for spawn_request: ${spawn_request_id}`);
      }

      if (waitingParentTask.blocked_on_task_id !== spawnRequest.instantiated_task_id) {
        throw new Error(`Parent waiting child linkage mismatch for spawn_request: ${spawn_request_id}`);
      }

      if (waitingParentTask.wait_reason !== TASK_STATES.WAITING_FOR_CHILD) {
        throw new Error(`Parent task did not persist waiting_for_child reason: ${spawn_request_id}`);
      }

      return Object.freeze({
        spawn_request: spawnRequest,
        parent_task: waitingParentTask,
      });
    },

    async mergeCompletedChildResultIntoParent({ child_task_id, actor_context = {} }) {
      const { childTask, spawnRequest, parentTask } = await loadCompletedGovernedChildContextOrThrow({ child_task_id });

      const mergePayload = {
        child_task_id: childTask.task_id,
        child_task_kind: childTask.task_kind,
        child_result_payload_json: childTask.result_payload_json || null,
        child_checkpoint_seq: childTask.checkpoint_seq,
        merged_from_spawn_request_id: spawnRequest.spawn_request_id,
        execution_substrate: childTask.input_payload_json && childTask.input_payload_json.execution_substrate
          ? childTask.input_payload_json.execution_substrate
          : 'custom_child_runtime',
        openclaw_delegation: childTask.input_payload_json && childTask.input_payload_json.openclaw_delegation
          ? childTask.input_payload_json.openclaw_delegation
          : null,
      };

      const mergeResult = await taskLifecycleService.recordChildResultMerge({
        task_id: parentTask.task_id,
        child_task_id: childTask.task_id,
        spawn_request_id: spawnRequest.spawn_request_id,
        merge_payload_json: mergePayload,
        actor_context,
      });

      return Object.freeze({
        parent_task: mergeResult.parent_task,
        child_task: childTask,
        spawn_request: spawnRequest,
      });
    },

    async resumeParentAfterChildMerge({ parent_task_id, actor_context = {} }) {
      const parentTask = await loadWaitingParentTaskByIdOrThrow({ parent_task_id });
      const mergedChildResult = parentTask.result_payload_json && parentTask.result_payload_json.merged_child_result;

      if (!mergedChildResult) {
        throw new Error(`Parent task is missing merged child result linkage: ${parent_task_id}`);
      }

      if (mergedChildResult.spawn_request_id !== parentTask.blocked_on_spawn_request_id) {
        throw new Error(`Merged child spawn linkage mismatch for parent task: ${parent_task_id}`);
      }

      if (mergedChildResult.child_task_id !== parentTask.blocked_on_task_id) {
        throw new Error(`Merged child task linkage mismatch for parent task: ${parent_task_id}`);
      }

      const resumedParentTask = await taskLifecycleService.resumeTask({
        task_id: parent_task_id,
        actor_context: {
          ...actor_context,
          bounded_resume_reason: 'parent_resumed_after_child',
        },
        reason: 'parent_resumed_after_child',
      });

      return Object.freeze({
        parent_task: resumedParentTask,
        resumed_from_child_task_id: mergedChildResult.child_task_id,
        resumed_from_spawn_request_id: mergedChildResult.spawn_request_id,
      });
    },
  });
}

module.exports = {
  PARENT_CHILD_COORDINATION_SERVICE_CONTRACT,
  createParentChildCoordinationService,
};
