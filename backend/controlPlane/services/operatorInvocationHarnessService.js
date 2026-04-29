// V1 control-plane operator invocation harness service.
// This module provides one bounded, operator-triggered invocation path over the accepted governed demo flow.
// It does not introduce new governance semantics, background workers, long-running runtime substrate,
// retry/recovery orchestration, operator UI, or broad runtime architecture.

const OPERATOR_INVOCATION_HARNESS_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'operatorInvocationHarnessService',
    service_role: 'bounded_operator_triggered_demo_invocation_harness',
    ownership_rule: 'The service layer may expose one narrow operator-triggered invocation path over accepted governed demo packaging without replacing governance source-of-truth services.',
    forbidden_direct_mutators: Object.freeze([
      'repositories',
      'background_workers',
      'runtime_builders',
      'operator_ui_layers',
      'ad_hoc_unbounded_orchestration',
    ]),
  }),

  implemented_methods: Object.freeze([
    'getInvocationContract',
    'invokeGovernedDemoScenario',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'background worker loop',
    'long-running runtime substrate',
    'retry/recovery orchestration',
    'broad runtime architecture',
    'operator UI',
    'new governance semantics',
    'API/server wiring',
  ]),
});

const OPERATOR_GOVERNED_DEMO_INVOCATION = Object.freeze({
  invocation_name: 'operator_governed_demo_run',
  invocation_kind: 'bounded_manual_runtime_harness',
  operator_trigger: 'explicit_service_call_only',
  execution_mode: 'single_bounded_run',
  source_of_truth: 'governedDemoPackagingService',
  outputs: Object.freeze([
    'scenario_definition',
    'walkthrough_result',
    'proof_bundle',
  ]),
});

function createOperatorInvocationHarnessService({ governedDemoPackagingService } = {}) {
  if (!governedDemoPackagingService
    || typeof governedDemoPackagingService.getFixedGovernedDemoScenario !== 'function'
    || typeof governedDemoPackagingService.runGovernedDemoWalkthrough !== 'function'
    || typeof governedDemoPackagingService.collectGovernedDemoProof !== 'function') {
    throw new Error('operatorInvocationHarnessService requires governedDemoPackagingService scenario, walkthrough, and proof methods');
  }

  return Object.freeze({
    getInvocationContract() {
      return Object.freeze({
        invocation: OPERATOR_GOVERNED_DEMO_INVOCATION,
        scenario: governedDemoPackagingService.getFixedGovernedDemoScenario(),
      });
    },

    async invokeGovernedDemoScenario({
      parent_task_id,
      approve_branch,
      deny_branch,
      actor_context = {},
    }) {
      if (!parent_task_id) {
        throw new Error('invokeGovernedDemoScenario requires parent_task_id');
      }

      if (!approve_branch || !deny_branch) {
        throw new Error('invokeGovernedDemoScenario requires approve_branch and deny_branch');
      }

      const scenario = governedDemoPackagingService.getFixedGovernedDemoScenario();
      const walkthrough_result = await governedDemoPackagingService.runGovernedDemoWalkthrough({
        parent_task_id,
        approve_branch,
        deny_branch,
        actor_context: {
          ...actor_context,
          actor_id: actor_context.actor_id || 'operatorInvocationHarnessService',
          invocation_name: OPERATOR_GOVERNED_DEMO_INVOCATION.invocation_name,
        },
      });

      const proof_bundle = await governedDemoPackagingService.collectGovernedDemoProof({
        parent_task_id,
        approved_spawn_request_id: walkthrough_result.approve_branch.approved.spawn_request.spawn_request_id,
        approved_approval_request_id: walkthrough_result.approve_branch.approved.approval_request.approval_request_id,
        child_task_id: walkthrough_result.approve_branch.completed_child.child_task.task_id,
        denied_spawn_request_id: walkthrough_result.deny_branch.denied.spawn_request.spawn_request_id,
        denied_approval_request_id: walkthrough_result.deny_branch.denied.approval_request.approval_request_id,
      });

      return Object.freeze({
        invocation: OPERATOR_GOVERNED_DEMO_INVOCATION,
        scenario,
        walkthrough_result,
        proof_bundle,
      });
    },
  });
}

module.exports = {
  OPERATOR_INVOCATION_HARNESS_CONTRACT,
  OPERATOR_GOVERNED_DEMO_INVOCATION,
  createOperatorInvocationHarnessService,
};
