const assert = require('assert');
const {
  createOpenClawWorkflowSurfaceService,
  TRACE_STAGES,
} = require('./openClawWorkflowSurfaceService');

const service = createOpenClawWorkflowSurfaceService();

const surface = service.buildWorkflowSurface({
  parent_task: {
    task_id: 'task-parent-1',
    status: 'ready',
    wait_reason: null,
    blocked_on_spawn_request_id: null,
    blocked_on_task_id: null,
    result_payload_json: {
      merged_child_result: {
        child_task_id: 'task-child-1',
        spawn_request_id: 'spawn-1',
        merged_at: '2026-04-29T14:10:00.000Z',
        child_result: {
          execution_substrate: 'openclaw_native_delegation',
        },
      },
    },
  },
  child_task: {
    task_id: 'task-child-1',
    status: 'completed',
    checkpoint_seq: 1,
    input_payload_json: {
      execution_substrate: 'openclaw_native_delegation',
      openclaw_delegation: {
        role_sequence: ['planner', 'worker', 'reviewer'],
        prompts_by_role: {
          planner: 'plan',
          worker: 'work',
          reviewer: 'review',
        },
        delegation_plan: {
          steps: [
            { openclaw_target: { kind: 'named_agent', agent_id: 'planner', transport: 'sessions_send' } },
            { openclaw_target: { kind: 'named_agent', agent_id: 'worker', transport: 'sessions_send' } },
            { openclaw_target: { kind: 'named_agent', agent_id: 'reviewer', transport: 'sessions_send' } },
          ],
        },
      },
    },
    result_payload_json: {
      execution_substrate: 'openclaw_native_delegation',
      delegated_child_task_id: 'task-child-1',
      completed_by_role: 'reviewer',
      delegation_result: {
        accepted: true,
      },
    },
  },
  spawn_request: {
    spawn_request_id: 'spawn-1',
    status: 'instantiated',
  },
  approval_request: {
    approval_request_id: 'approval-1',
    status: 'approved',
  },
  child_task_events: [
    { event_id: 'evt-1', event_type: 'task_started', created_at: '2026-04-29T14:02:00.000Z' },
    { event_id: 'evt-2', event_type: 'task_checkpoint_written', created_at: '2026-04-29T14:05:00.000Z' },
    { event_id: 'evt-3', event_type: 'task_completed', created_at: '2026-04-29T14:08:00.000Z' },
  ],
  audit_trail: [
    { audit_event_id: 'aud-1', event_type: 'spawn_approved', occurred_at: '2026-04-29T14:01:00.000Z' },
    { audit_event_id: 'aud-2', event_type: 'child_instantiated', occurred_at: '2026-04-29T14:02:00.000Z' },
  ],
});

assert.equal(surface.surface_kind, 'openclaw_native_governed_workflow_surface');
assert.equal(surface.read_only, true);
assert.equal(surface.workflow_status, 'merged_back');
assert.equal(surface.execution_substrate, 'openclaw_native_delegation');
assert.deepEqual(TRACE_STAGES, ['proposal', 'approval', 'delegation', 'planner', 'worker', 'reviewer', 'result', 'merge_resume']);
assert.equal(surface.trace_stages.length, TRACE_STAGES.length);
assert.equal(surface.trace_stages.find((item) => item.stage === 'delegation').status, 'visible');
assert.equal(surface.trace_stages.find((item) => item.stage === 'planner').status, 'visible');
assert.equal(surface.trace_stages.find((item) => item.stage === 'worker').status, 'visible');
assert.equal(surface.trace_stages.find((item) => item.stage === 'reviewer').status, 'visible');
assert.equal(surface.trace_stages.find((item) => item.stage === 'result').status, 'visible');
assert.equal(surface.trace_stages.find((item) => item.stage === 'merge_resume').status, 'visible');
assert.equal(surface.role_trace.length, 3);
assert.equal(surface.role_trace[0].role, 'planner');
assert.equal(surface.role_trace[1].openclaw_target.agent_id, 'worker');
assert.equal(surface.progression.resumed_parent_ready, true);
assert.equal(surface.delegated_result_summary.completed_by_role, 'reviewer');
assert.equal(surface.merged_result_summary.execution_substrate, 'openclaw_native_delegation');
assert.equal(surface.visible_task_events.length, 3);
assert.equal(surface.visible_audit_events.length, 2);
assert.equal(surface.openclaw_visibility_projection.no_worker_loop, true);
assert.equal(surface.openclaw_visibility_projection.no_retry_or_recovery, true);

console.log('openClawWorkflowSurfaceService test passed');
