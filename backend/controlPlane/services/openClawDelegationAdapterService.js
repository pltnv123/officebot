// V1 OpenClaw-native delegation adapter service.
// This module translates one approved governed child intent into bounded OpenClaw-native
// delegated execution semantics without replacing proposal/approval/source-of-truth governance.
// No background worker loop, autonomous orchestration, retry/recovery, API wiring,
// or broad runtime platform ownership belongs here.

const OPENCLAW_DELEGATION_ADAPTER_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'openClawDelegationAdapterService',
    service_role: 'bounded_openclaw_native_delegation_adapter',
    ownership_rule: 'The service layer may translate one approved governed child intent into OpenClaw-native delegated execution metadata while governance remains authoritative elsewhere.',
    forbidden_direct_mutators: Object.freeze([
      'background_workers',
      'autonomous_loops',
      'retry_recovery_orchestration',
      'runtime_builders',
      'operator_ui_layers',
      'ad_hoc_unbounded_orchestration',
    ]),
  }),

  implemented_methods: Object.freeze([
    'buildDelegationPlan',
    'materializeDelegatedChildPayload',
    'buildChildCompletionPayload',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'background worker loop',
    'actual OpenClaw transport invocation from inside the repo',
    'autonomous routing',
    'retry/recovery orchestration',
    'operator UI',
    'broad runtime architecture',
  ]),
});

const DEFAULT_ROLE_SEQUENCE = Object.freeze(['planner', 'worker', 'reviewer']);

function createOpenClawDelegationAdapterService() {
  function normalizeRole(role) {
    return String(role || '').trim().toLowerCase();
  }

  function ensureRoleSequence(roleSequence) {
    const sequence = Array.isArray(roleSequence) && roleSequence.length > 0
      ? roleSequence.map(normalizeRole)
      : [...DEFAULT_ROLE_SEQUENCE];

    const expected = DEFAULT_ROLE_SEQUENCE.join(',');
    if (sequence.join(',') !== expected) {
      throw new Error(`OpenClaw delegation adapter requires fixed role sequence: ${expected}`);
    }

    return Object.freeze(sequence);
  }

  function buildDelegationStep({ role, childTask, spawnRequest, template, parentTask, index }) {
    return Object.freeze({
      step_id: `${childTask.task_id}:${role}:${index + 1}`,
      role,
      openclaw_target: Object.freeze({
        kind: 'named_agent',
        agent_id: role,
        transport: 'sessions_send',
      }),
      scope: Object.freeze({
        parent_task_id: parentTask.task_id,
        child_task_id: childTask.task_id,
        spawn_request_id: spawnRequest.spawn_request_id,
        root_task_id: spawnRequest.root_task_id,
        child_task_kind: childTask.task_kind,
        template_id: template.agent_template_id,
        template_version: template.version,
      }),
      execution_rules: Object.freeze({
        bounded: true,
        approval_already_granted: true,
        no_background_worker: true,
        no_retry_or_recovery: true,
        no_autonomous_loop: true,
      }),
    });
  }

  function buildDelegationPrompt({ role, childTask, spawnRequest, parentTask, childTaskScope, justification }) {
    const header = [
      'OpenClaw-native governed delegation task.',
      `Role: ${role}.`,
      `Parent task: ${parentTask.task_id}.`,
      `Child task: ${childTask.task_id}.`,
      `Spawn request: ${spawnRequest.spawn_request_id}.`,
      `Child task kind: ${childTask.task_kind}.`,
      '',
      'Boundaries:',
      '- Stay within the provided scope.',
      '- No retry/recovery orchestration.',
      '- No autonomous follow-up spawning.',
      '- Return one bounded result only.',
    ];

    const scopeBlock = [
      '',
      'Child scope JSON:',
      JSON.stringify(childTaskScope || {}, null, 2),
    ];

    const justificationBlock = justification
      ? ['', `Justification: ${justification}`]
      : [];

    const roleInstructions = {
      planner: [
        '',
        'Planner task:',
        '- produce a bounded decomposition/execution brief for the scoped child task',
        '- do not execute the full task',
      ],
      worker: [
        '',
        'Worker task:',
        '- perform the bounded scoped work',
        '- return concise execution result and evidence',
      ],
      reviewer: [
        '',
        'Reviewer task:',
        '- validate the bounded worker result',
        '- return acceptance notes or bounded issues only',
      ],
    };

    return [...header, ...scopeBlock, ...justificationBlock, ...(roleInstructions[role] || [])].join('\n');
  }

  return Object.freeze({
    buildDelegationPlan({
      parent_task,
      child_task,
      spawn_request,
      template,
      role_sequence = DEFAULT_ROLE_SEQUENCE,
    }) {
      if (!parent_task || !child_task || !spawn_request || !template) {
        throw new Error('buildDelegationPlan requires parent_task, child_task, spawn_request, and template');
      }

      const roles = ensureRoleSequence(role_sequence);
      const steps = roles.map((role, index) => buildDelegationStep({
        role,
        childTask: child_task,
        spawnRequest: spawn_request,
        template,
        parentTask: parent_task,
        index,
      }));

      return Object.freeze({
        execution_substrate: 'openclaw_native_delegation',
        owner_agent: 'main',
        child_task_id: child_task.task_id,
        parent_task_id: parent_task.task_id,
        spawn_request_id: spawn_request.spawn_request_id,
        delegation_strategy: 'named_agent_sequence',
        role_sequence: roles,
        steps,
      });
    },

    materializeDelegatedChildPayload({
      parent_task,
      child_task,
      spawn_request,
      template,
      role_sequence = DEFAULT_ROLE_SEQUENCE,
    }) {
      const delegationPlan = this.buildDelegationPlan({
        parent_task,
        child_task,
        spawn_request,
        template,
        role_sequence,
      });

      const prompts = delegationPlan.role_sequence.reduce((acc, role) => {
        acc[role] = buildDelegationPrompt({
          role,
          childTask: child_task,
          spawnRequest: spawn_request,
          parentTask: parent_task,
          childTaskScope: child_task.task_scope_json,
          justification: spawn_request.justification,
        });
        return acc;
      }, {});

      return Object.freeze({
        execution_substrate: delegationPlan.execution_substrate,
        owner_agent: delegationPlan.owner_agent,
        delegation_strategy: delegationPlan.delegation_strategy,
        role_sequence: delegationPlan.role_sequence,
        delegation_plan: delegationPlan,
        prompts_by_role: Object.freeze(prompts),
      });
    },

    buildChildCompletionPayload({
      child_task,
      delegation_result,
      completed_by_role = 'reviewer',
    }) {
      if (!child_task) {
        throw new Error('buildChildCompletionPayload requires child_task');
      }

      if (delegation_result === undefined) {
        throw new Error('buildChildCompletionPayload requires delegation_result');
      }

      return Object.freeze({
        execution_substrate: 'openclaw_native_delegation',
        delegated_child_task_id: child_task.task_id,
        completed_by_role: normalizeRole(completed_by_role) || 'reviewer',
        delegation_result,
      });
    },
  });
}

module.exports = {
  DEFAULT_ROLE_SEQUENCE,
  OPENCLAW_DELEGATION_ADAPTER_SERVICE_CONTRACT,
  createOpenClawDelegationAdapterService,
};
