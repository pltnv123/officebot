// V1 control-plane parent/child coordination service.
// This module realizes only the bounded parent waiting_for_child mediation path.
// No child execution, checkpoints/heartbeats, merge-back behavior,
// parent resume behavior, executor integration, API wiring, or runtime builder authority belongs here.

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
    task_lifecycle_service: 'Required for authoritative parent task state mediation into waiting_for_child.',
    transition_guard_contract: 'Required for validating bounded spawn_request/task state expectations before coordination.',
  }),

  implemented_methods: Object.freeze([
    'enterParentWaitingForChild',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'child execution loop',
    'checkpoints/heartbeats/progress handling',
    'child completion handling',
    'merge_back behavior',
    'parent resume behavior',
    'executor loop integration',
    'API/runtime wiring',
  ]),
});

function createParentChildCoordinationService({ repositories, taskLifecycleService, transitionGuardContract = TRANSITION_GUARD_CONTRACT } = {}) {
  if (!repositories || !repositories.spawnRequests || !repositories.tasks) {
    throw new Error('parentChildCoordinationService requires repositories.spawnRequests and repositories.tasks');
  }

  if (!taskLifecycleService || typeof taskLifecycleService.waitForChild !== 'function') {
    throw new Error('parentChildCoordinationService requires taskLifecycleService.waitForChild');
  }

  const taskTransitions = transitionGuardContract.task_state_transitions || {};

  function ensureParentMayWaitForChild(fromState) {
    const allowedNextStates = taskTransitions[fromState] || [];
    if (!allowedNextStates.includes(TASK_STATES.WAITING_FOR_CHILD)) {
      throw new Error(`Parent task may not enter waiting_for_child from state: ${fromState}`);
    }
  }

  async function loadInstantiatedSpawnOrThrow({ spawn_request_id }) {
    if (!spawn_request_id) {
      throw new Error('enterParentWaitingForChild requires spawn_request_id');
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

  return Object.freeze({
    async enterParentWaitingForChild({ spawn_request_id, actor_context = {}, reason = null }) {
      const spawnRequest = await loadInstantiatedSpawnOrThrow({ spawn_request_id });

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
  });
}

module.exports = {
  PARENT_CHILD_COORDINATION_SERVICE_CONTRACT,
  createParentChildCoordinationService,
};
