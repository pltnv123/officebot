// V1 TaskFlow-native governed-flow identity helper for the first governed workflow.
// This helper shapes one bounded shared governed-flow identity across child linkage,
// wait/resume carrier metadata, child execution progression, and operator-visible surface.
// It does not create managed flows, invoke TaskFlow runtime, start worker loops,
// or broaden migration beyond the first governed workflow.

const TASKFLOW_GOVERNED_FLOW_IDENTITY_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'taskflowGovernedFlowIdentityService',
    service_role: 'bounded_taskflow_governed_flow_identity_helper',
    ownership_rule: 'The service layer may shape a shared TaskFlow-native governed-flow identity for the first governed workflow while governance and execution ownership remain elsewhere.',
    forbidden_direct_mutators: Object.freeze([
      'background_workers',
      'autonomous_loops',
      'retry_recovery_orchestration',
      'taskflow_runtime_invocation',
      'broad_multi_workflow_rollout',
    ]),
  }),

  implemented_methods: Object.freeze([
    'buildGovernedFlowIdentity',
    'buildFlowId',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'managed flow creation',
    'runTask invocation',
    'broad governed-flow identity rollout',
    'multi-workflow orchestration',
  ]),
});

function buildFlowId({ root_task_id, parent_task_id, spawn_request_id, child_task_id }) {
  return [
    'governed',
    root_task_id || 'root',
    parent_task_id || 'parent',
    spawn_request_id || 'spawn',
    child_task_id || 'child',
  ].join(':');
}

function createTaskflowGovernedFlowIdentityService() {
  return Object.freeze({
    buildFlowId,

    buildGovernedFlowIdentity({
      parent_task,
      spawn_request,
      child_task = null,
      approval_request = null,
      execution_substrate = 'openclaw_native_delegation',
      owner_session = 'main',
      current_step = 'governed_flow_visible',
      role_sequence = [],
    }) {
      if (!parent_task || !spawn_request) {
        throw new Error('buildGovernedFlowIdentity requires parent_task and spawn_request');
      }

      const root_task_id = parent_task.root_task_id || parent_task.task_id;
      const parent_task_id = parent_task.task_id;
      const child_task_id = child_task ? child_task.task_id : (spawn_request.instantiated_task_id || null);
      const spawn_request_id = spawn_request.spawn_request_id;
      const approval_request_id = approval_request ? approval_request.approval_request_id : (spawn_request.approval_request_id || null);

      return Object.freeze({
        identity_kind: 'taskflow_native_governed_flow_identity',
        flow_model: 'managed_flow_intent',
        flow_id: buildFlowId({
          root_task_id,
          parent_task_id,
          spawn_request_id,
          child_task_id,
        }),
        owner_session,
        root_task_id,
        parent_task_id,
        child_task_id,
        spawn_request_id,
        approval_request_id,
        execution_substrate,
        current_step,
        role_sequence: Object.freeze(Array.isArray(role_sequence) ? [...role_sequence] : []),
      });
    },
  });
}

module.exports = {
  TASKFLOW_GOVERNED_FLOW_IDENTITY_SERVICE_CONTRACT,
  createTaskflowGovernedFlowIdentityService,
};
