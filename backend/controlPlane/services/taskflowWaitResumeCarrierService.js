// V1 TaskFlow-native wait/resume carrier helper for the first governed workflow.
// This helper only shapes bounded TaskFlow-aligned carrier metadata for waiting and resume paths.
// It reuses the shared governed-flow identity helper so the first governed workflow
// carries one honest TaskFlow-native identity across bounded wait/resume surfaces.
// It does not own TaskFlow runtime calls, worker execution, retry/recovery, or orchestration policy.

const { createTaskflowGovernedFlowIdentityService } = require('./taskflowGovernedFlowIdentityService');

const TASKFLOW_WAIT_RESUME_CARRIER_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'taskflowWaitResumeCarrierService',
    service_role: 'bounded_taskflow_wait_resume_carrier_helper',
    ownership_rule: 'The service layer may shape TaskFlow-native carrier metadata for the first governed workflow while governance and lifecycle ownership remain elsewhere.',
    forbidden_direct_mutators: Object.freeze([
      'background_workers',
      'autonomous_loops',
      'retry_recovery_orchestration',
      'taskflow_runtime_invocation',
      'broad_multi_workflow_rollout',
    ]),
  }),

  implemented_methods: Object.freeze([
    'buildWaitingForChildCarrier',
    'buildResumeCarrier',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'managed flow creation',
    'runTask invocation',
    'broad waiting semantics migration',
    'approval waiting migration',
    'background execution',
  ]),
});

function createTaskflowWaitResumeCarrierService({ taskflowGovernedFlowIdentityService = createTaskflowGovernedFlowIdentityService() } = {}) {
  return Object.freeze({
    buildWaitingForChildCarrier({ parent_task, spawn_request, child_task_id, current_step = 'awaiting_child_execution', wait_reason = 'waiting_for_child' }) {
      if (!parent_task || !spawn_request || !child_task_id) {
        throw new Error('buildWaitingForChildCarrier requires parent_task, spawn_request, and child_task_id');
      }

      const governedFlowIdentity = taskflowGovernedFlowIdentityService.buildGovernedFlowIdentity({
        parent_task,
        spawn_request,
        child_task: { task_id: child_task_id },
        execution_substrate: 'openclaw_native_delegation',
        current_step,
      });

      return Object.freeze({
        carrier_kind: 'taskflow_native_wait_resume',
        flow_model: governedFlowIdentity.flow_model,
        flow_id: governedFlowIdentity.flow_id,
        owner_session: governedFlowIdentity.owner_session,
        current_step,
        status: 'waiting',
        wait_json: Object.freeze({
          kind: 'child_task',
          wait_reason,
          parent_task_id: parent_task.task_id,
          child_task_id,
          spawn_request_id: spawn_request.spawn_request_id,
          execution_substrate: 'openclaw_native_delegation',
        }),
        state_json: Object.freeze({
          parent_task_id: parent_task.task_id,
          child_task_id,
          spawn_request_id: spawn_request.spawn_request_id,
          root_task_id: governedFlowIdentity.root_task_id,
          current_step,
        }),
        governed_flow_identity: governedFlowIdentity,
      });
    },

    buildResumeCarrier({ parent_task, merged_child_result, resumed_from_child_task_id, resumed_from_spawn_request_id, current_step = 'resumed_after_child_merge' }) {
      if (!parent_task || !resumed_from_child_task_id || !resumed_from_spawn_request_id) {
        throw new Error('buildResumeCarrier requires parent_task, resumed_from_child_task_id, and resumed_from_spawn_request_id');
      }

      const governedFlowIdentity = taskflowGovernedFlowIdentityService.buildGovernedFlowIdentity({
        parent_task,
        spawn_request: {
          spawn_request_id: resumed_from_spawn_request_id,
          approval_request_id: parent_task.blocked_on_approval_request_id || null,
          instantiated_task_id: resumed_from_child_task_id,
        },
        child_task: { task_id: resumed_from_child_task_id },
        execution_substrate: merged_child_result?.child_result?.execution_substrate || 'openclaw_native_delegation',
        current_step,
      });

      return Object.freeze({
        carrier_kind: 'taskflow_native_wait_resume',
        flow_model: governedFlowIdentity.flow_model,
        flow_id: governedFlowIdentity.flow_id,
        owner_session: governedFlowIdentity.owner_session,
        current_step,
        status: 'running',
        wait_json: null,
        state_json: Object.freeze({
          parent_task_id: parent_task.task_id,
          resumed_from_child_task_id,
          resumed_from_spawn_request_id,
          root_task_id: governedFlowIdentity.root_task_id,
          merged_child_result_present: Boolean(merged_child_result),
          current_step,
        }),
        governed_flow_identity: governedFlowIdentity,
      });
    },
  });
}

module.exports = {
  TASKFLOW_WAIT_RESUME_CARRIER_SERVICE_CONTRACT,
  createTaskflowWaitResumeCarrierService,
};
