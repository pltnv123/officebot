// V1 TaskFlow-native child-task linkage helper for the first governed workflow.
// This helper only shapes bounded TaskFlow-aligned child linkage metadata.
// It reuses the shared governed-flow identity helper so the first governed workflow
// carries one honest TaskFlow-native identity across bounded linkage surfaces.
// It does not create managed flows, run detached tasks, or own execution orchestration.

const { createTaskflowGovernedFlowIdentityService } = require('./taskflowGovernedFlowIdentityService');

const TASKFLOW_CHILD_LINKAGE_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'taskflowChildLinkageService',
    service_role: 'bounded_taskflow_child_linkage_helper',
    ownership_rule: 'The service layer may shape TaskFlow-native child linkage metadata for the first governed workflow while governance and execution ownership remain elsewhere.',
    forbidden_direct_mutators: Object.freeze([
      'background_workers',
      'autonomous_loops',
      'retry_recovery_orchestration',
      'taskflow_runtime_invocation',
      'broad_multi_workflow_rollout',
    ]),
  }),

  implemented_methods: Object.freeze([
    'buildChildLinkage',
    'buildExecutionLinkage',
    'buildCompletionLinkage',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'managed flow creation',
    'runTask invocation',
    'broad child linkage migration',
    'multi-workflow orchestration',
  ]),
});

function createTaskflowChildLinkageService({ taskflowGovernedFlowIdentityService = createTaskflowGovernedFlowIdentityService() } = {}) {
  return Object.freeze({
    buildChildLinkage({ parent_task, spawn_request, child_task, approval_request = null, openclaw_delegation = null }) {
      if (!parent_task || !spawn_request || !child_task) {
        throw new Error('buildChildLinkage requires parent_task, spawn_request, and child_task');
      }

      const governedFlowIdentity = taskflowGovernedFlowIdentityService.buildGovernedFlowIdentity({
        parent_task,
        spawn_request,
        child_task,
        approval_request,
        execution_substrate: openclaw_delegation ? 'openclaw_native_delegation' : 'custom_child_runtime',
        current_step: 'child_linked',
        role_sequence: openclaw_delegation?.role_sequence || [],
      });

      return Object.freeze({
        linkage_kind: 'taskflow_native_child_linkage',
        flow_model: governedFlowIdentity.flow_model,
        flow_id: governedFlowIdentity.flow_id,
        owner_session: governedFlowIdentity.owner_session,
        parent_task_id: governedFlowIdentity.parent_task_id,
        child_task_id: governedFlowIdentity.child_task_id,
        root_task_id: governedFlowIdentity.root_task_id,
        spawn_request_id: governedFlowIdentity.spawn_request_id,
        approval_request_id: governedFlowIdentity.approval_request_id,
        current_step: governedFlowIdentity.current_step,
        child_label: `${child_task.task_kind || 'child_task'}:${child_task.task_id}`,
        execution_substrate: governedFlowIdentity.execution_substrate,
        role_sequence: governedFlowIdentity.role_sequence,
        governed_flow_identity: governedFlowIdentity,
      });
    },

    buildExecutionLinkage({ child_task, taskflow_child_linkage, delegation_plan = null }) {
      if (!child_task || !taskflow_child_linkage) {
        throw new Error('buildExecutionLinkage requires child_task and taskflow_child_linkage');
      }

      return Object.freeze({
        linkage_kind: 'taskflow_native_child_execution',
        flow_id: taskflow_child_linkage.flow_id,
        child_task_id: child_task.task_id,
        current_step: 'child_running',
        owner_session: taskflow_child_linkage.owner_session,
        role_sequence: taskflow_child_linkage.role_sequence,
        child_label: taskflow_child_linkage.child_label,
        linked_delegation_steps: delegation_plan?.steps?.length || 0,
      });
    },

    buildCompletionLinkage({ child_task, taskflow_child_linkage, completed_by_role = null }) {
      if (!child_task || !taskflow_child_linkage) {
        throw new Error('buildCompletionLinkage requires child_task and taskflow_child_linkage');
      }

      return Object.freeze({
        linkage_kind: 'taskflow_native_child_completion',
        flow_id: taskflow_child_linkage.flow_id,
        child_task_id: child_task.task_id,
        current_step: 'child_completed',
        owner_session: taskflow_child_linkage.owner_session,
        completed_by_role,
      });
    },
  });
}

module.exports = {
  TASKFLOW_CHILD_LINKAGE_SERVICE_CONTRACT,
  createTaskflowChildLinkageService,
};
