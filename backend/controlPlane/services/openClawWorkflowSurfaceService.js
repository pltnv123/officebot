// V1 OpenClaw-native workflow surface service.
// This module projects one governed workflow into a bounded operator-visible surface.
// It reuses the shared governed-flow identity helper so the first governed workflow
// is surfaced with one honest TaskFlow-native identity across bounded projection layers.
// It does not own governance decisions, execution transport, worker loops, retry/recovery,
// dashboard construction, or broad runtime authority.

const { createTaskflowGovernedFlowIdentityService } = require('./taskflowGovernedFlowIdentityService');

const OPENCLAW_WORKFLOW_SURFACE_SERVICE_CONTRACT = Object.freeze({
  service_identity: Object.freeze({
    service_name: 'openClawWorkflowSurfaceService',
    service_role: 'bounded_openclaw_native_workflow_visibility_projection',
    ownership_rule: 'The service layer may project one governed workflow into an honest operator-visible OpenClaw-native surface while governance and execution remain authoritative elsewhere.',
    forbidden_direct_mutators: Object.freeze([
      'background_workers',
      'autonomous_loops',
      'retry_recovery_orchestration',
      'runtime_builders',
      'dashboard_buildouts',
      'unbounded_multi_workflow_platforms',
    ]),
  }),

  implemented_methods: Object.freeze([
    'buildWorkflowSurface',
  ]),

  out_of_scope_for_this_bundle_step: Object.freeze([
    'governance mutations',
    'execution transport ownership',
    'taskflow rollout',
    'operator write controls beyond read-only surface',
    'dashboard-first UI strategy',
    'background worker loop',
    'retry/recovery orchestration',
  ]),
});

const TRACE_STAGES = Object.freeze([
  'proposal',
  'approval',
  'delegation',
  'planner',
  'worker',
  'reviewer',
  'result',
  'merge_resume',
]);

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeTaskEvent(event = {}) {
  return Object.freeze({
    event_id: event.event_id || null,
    event_type: event.event_type || null,
    created_at: event.created_at || null,
    event_payload_json: event.event_payload_json || null,
    agent_id: event.agent_id || null,
  });
}

function normalizeAuditEvent(event = {}) {
  return Object.freeze({
    audit_event_id: event.audit_event_id || null,
    event_type: event.event_type || null,
    occurred_at: event.occurred_at || null,
    entity_type: event.entity_type || null,
    entity_id: event.entity_id || null,
    related_task_id: event.related_task_id || null,
    related_agent_id: event.related_agent_id || null,
    related_spawn_request_id: event.related_spawn_request_id || null,
    related_approval_request_id: event.related_approval_request_id || null,
    payload_summary: event.payload_summary || null,
  });
}

function firstEvent(events, type) {
  return events.find((event) => event.event_type === type) || null;
}

function lastEvent(events, type) {
  const matches = events.filter((event) => event.event_type === type);
  return matches.length ? matches[matches.length - 1] : null;
}

function buildStage({ stage, status, source, detail = null, role = null, related_ids = null }) {
  return Object.freeze({
    stage,
    status,
    source,
    role,
    detail,
    related_ids,
  });
}

function deriveStageSet({ spawnRequest, approvalRequest, childTask, childTaskEvents, parentTask }) {
  const roleSequence = childTask?.input_payload_json?.openclaw_delegation?.role_sequence || [];
  const mergedChild = parentTask?.result_payload_json?.merged_child_result || null;
  const childResult = childTask?.result_payload_json || null;

  return Object.freeze([
    buildStage({
      stage: 'proposal',
      status: spawnRequest ? 'visible' : 'missing',
      source: 'spawn_request',
      detail: spawnRequest ? spawnRequest.status : 'spawn_request_missing',
      related_ids: spawnRequest ? { spawn_request_id: spawnRequest.spawn_request_id } : null,
    }),
    buildStage({
      stage: 'approval',
      status: approvalRequest ? 'visible' : 'missing',
      source: 'approval_request',
      detail: approvalRequest ? approvalRequest.status : 'approval_request_missing',
      related_ids: approvalRequest ? { approval_request_id: approvalRequest.approval_request_id } : null,
    }),
    buildStage({
      stage: 'delegation',
      status: childTask?.input_payload_json?.execution_substrate === 'openclaw_native_delegation' ? 'visible' : 'missing',
      source: 'child_task',
      detail: childTask?.input_payload_json?.execution_substrate || 'not_openclaw_native_delegation',
      related_ids: childTask ? { child_task_id: childTask.task_id } : null,
    }),
    buildStage({
      stage: 'planner',
      status: roleSequence.includes('planner') ? 'visible' : 'missing',
      source: 'delegation_plan',
      role: 'planner',
      detail: firstEvent(childTaskEvents, 'task_started') ? 'role_in_delegation_plan_and_task_started' : 'role_in_delegation_plan',
      related_ids: childTask ? { child_task_id: childTask.task_id } : null,
    }),
    buildStage({
      stage: 'worker',
      status: roleSequence.includes('worker') ? 'visible' : 'missing',
      source: 'delegation_plan',
      role: 'worker',
      detail: lastEvent(childTaskEvents, 'task_checkpoint_written') ? 'role_in_delegation_plan_and_checkpoint_visible' : 'role_in_delegation_plan',
      related_ids: childTask ? { child_task_id: childTask.task_id } : null,
    }),
    buildStage({
      stage: 'reviewer',
      status: roleSequence.includes('reviewer') ? 'visible' : 'missing',
      source: 'delegation_plan',
      role: 'reviewer',
      detail: childResult?.completed_by_role || 'role_in_delegation_plan',
      related_ids: childTask ? { child_task_id: childTask.task_id } : null,
    }),
    buildStage({
      stage: 'result',
      status: childResult ? 'visible' : 'missing',
      source: 'child_result',
      detail: childResult ? 'child_result_payload_present' : 'child_result_payload_missing',
      related_ids: childTask ? { child_task_id: childTask.task_id } : null,
    }),
    buildStage({
      stage: 'merge_resume',
      status: mergedChild ? 'visible' : 'missing',
      source: 'parent_task',
      detail: mergedChild ? 'merged_child_result_present' : 'merged_child_result_missing',
      related_ids: parentTask ? { parent_task_id: parentTask.task_id } : null,
    }),
  ]);
}

function deriveWorkflowStatus({ spawnRequest, approvalRequest, childTask, parentTask }) {
  if (!spawnRequest || !approvalRequest || !childTask || !parentTask) return 'partial';
  if (parentTask.result_payload_json?.merged_child_result) return 'merged_back';
  if (childTask.result_payload_json) return 'child_completed';
  if (childTask.status === 'running') return 'delegated_running';
  if (childTask.input_payload_json?.execution_substrate === 'openclaw_native_delegation') return 'delegated_visible';
  return 'partial';
}

function createOpenClawWorkflowSurfaceService({ taskflowGovernedFlowIdentityService = createTaskflowGovernedFlowIdentityService() } = {}) {
  return Object.freeze({
    buildWorkflowSurface({
      parent_task = null,
      child_task = null,
      spawn_request = null,
      approval_request = null,
      child_task_events = [],
      audit_trail = [],
      source_surface = 'openclaw_native_operator_visibility',
    } = {}) {
      const normalizedTaskEvents = Object.freeze((Array.isArray(child_task_events) ? child_task_events : []).map(normalizeTaskEvent));
      const normalizedAuditTrail = Object.freeze((Array.isArray(audit_trail) ? audit_trail : []).map(normalizeAuditEvent));
      const roleSequence = Object.freeze(child_task?.input_payload_json?.openclaw_delegation?.role_sequence || []);
      const delegationPlan = child_task?.input_payload_json?.openclaw_delegation?.delegation_plan || null;
      const mergedChild = parent_task?.result_payload_json?.merged_child_result || null;
      const childResult = child_task?.result_payload_json || null;
      const executionSubstrate = child_task?.input_payload_json?.execution_substrate
        || mergedChild?.child_result?.execution_substrate
        || 'openclaw_native_delegation';
      const governedFlowIdentity = parent_task && spawn_request
        ? taskflowGovernedFlowIdentityService.buildGovernedFlowIdentity({
            parent_task,
            spawn_request,
            child_task,
            approval_request,
            execution_substrate: executionSubstrate,
            current_step: mergedChild
              ? 'merged_back'
              : childResult
                ? 'child_completed'
                : child_task?.status === 'running'
                  ? 'child_running'
                  : child_task
                    ? 'child_linked'
                    : 'governed_flow_visible',
            role_sequence: roleSequence,
          })
        : null;

      return Object.freeze({
        surface_kind: 'openclaw_native_governed_workflow_surface',
        source_surface,
        bounded: true,
        governed: true,
        read_only: true,
        workflow_status: deriveWorkflowStatus({
          spawnRequest: spawn_request,
          approvalRequest: approval_request,
          childTask: child_task,
          parentTask: parent_task,
        }),
        execution_substrate: executionSubstrate || null,
        trace_stages: deriveStageSet({
          spawnRequest: spawn_request,
          approvalRequest: approval_request,
          childTask: child_task,
          childTaskEvents: normalizedTaskEvents,
          parentTask: parent_task,
        }),
        role_trace: Object.freeze(roleSequence.map((role, index) => Object.freeze({
          role,
          sequence_index: index,
          openclaw_target: delegationPlan?.steps?.[index]?.openclaw_target || null,
          prompt_visible: Boolean(child_task?.input_payload_json?.openclaw_delegation?.prompts_by_role?.[role]),
          bounded: true,
        }))),
        ids: Object.freeze({
          parent_task_id: governedFlowIdentity?.parent_task_id || parent_task?.task_id || null,
          child_task_id: governedFlowIdentity?.child_task_id || child_task?.task_id || null,
          spawn_request_id: governedFlowIdentity?.spawn_request_id || spawn_request?.spawn_request_id || null,
          approval_request_id: governedFlowIdentity?.approval_request_id || approval_request?.approval_request_id || null,
          governed_flow_id: governedFlowIdentity?.flow_id || null,
        }),
        progression: Object.freeze({
          parent_status: parent_task?.status || null,
          child_status: child_task?.status || null,
          spawn_status: spawn_request?.status || null,
          approval_status: approval_request?.status || null,
          checkpoint_seq: child_task?.checkpoint_seq ?? null,
          merged_back: Boolean(mergedChild),
          resumed_parent_ready: Boolean(
            parent_task
            && parent_task.status === 'ready'
            && parent_task.wait_reason == null
            && parent_task.blocked_on_spawn_request_id == null
            && parent_task.blocked_on_task_id == null
          ),
        }),
        delegated_result_summary: childResult ? Object.freeze({
          execution_substrate: childResult.execution_substrate || null,
          completed_by_role: childResult.completed_by_role || null,
          delegated_child_task_id: childResult.delegated_child_task_id || null,
          delegation_result_present: Object.prototype.hasOwnProperty.call(childResult, 'delegation_result'),
        }) : null,
        merged_result_summary: mergedChild ? Object.freeze({
          merged_at: mergedChild.merged_at || null,
          child_task_id: mergedChild.child_task_id || null,
          spawn_request_id: mergedChild.spawn_request_id || null,
          execution_substrate: mergedChild.child_result?.execution_substrate || null,
        }) : null,
        visible_task_events: normalizedTaskEvents,
        visible_audit_events: normalizedAuditTrail,
        governed_flow_identity: governedFlowIdentity,
        openclaw_visibility_projection: Object.freeze({
          operator_surface_kind: 'read_only_export_projection',
          session_visibility: 'represented_by_named_agent_role_trace',
          task_visibility: 'represented_by_governed_child_and_parent_linkage',
          no_worker_loop: true,
          no_retry_or_recovery: true,
          no_autonomous_runtime_claim: true,
        }),
      });
    },
  });
}

module.exports = {
  OPENCLAW_WORKFLOW_SURFACE_SERVICE_CONTRACT,
  TRACE_STAGES,
  createOpenClawWorkflowSurfaceService,
};
