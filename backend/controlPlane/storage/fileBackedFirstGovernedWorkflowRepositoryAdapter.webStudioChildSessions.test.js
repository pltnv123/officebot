const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-child-session-adapter-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;

  const stored = await repositories.webStudioChildSessions.createChildSession({
    child_session: {
      child_session_id: 'ws-child-session-test-a',
      order_id: 'ws-order-test-1',
      variant_id: 'ws-variant-test-a',
      branch_name: 'A',
      child_task_id: 'ws-child-task-test-a',
      child_agent_id: 'ws-agent-webstudio-variant-a',
      child_workspace_key: 'ws-workspace-ws-order-test-1-a',
      child_workspace_path: '/tmp/webstudio/ws-order-test-1/a',
      governed_flow_id: 'ws-governed-flow-ws-order-test-1',
      taskflow_id: 'ws-taskflow-ws-order-test-1',
      binding_id: 'ws-taskflow-binding-ws-order-test-1',
      source: 'bounded_local_child_session_identity',
      openclaw_native: false,
      isolation_mode: 'per_variant_workspace',
      context_mode: 'bounded_local',
      status: 'ready',
      execution_spec: { branch_name: 'A', design_direction: 'premium conversion landing' },
      created_at: '2026-04-29T00:00:00.000Z',
      updated_at: '2026-04-29T00:00:00.000Z',
    },
  });

  assert(stored.child_session_id, 'child session must be stored');
  const fetched = await repositories.webStudioChildSessions.getChildSessionByVariantId({ variant_id: 'ws-variant-test-a' });
  assert(fetched, 'must load child session by variant id');
  assert.strictEqual(fetched.child_workspace_key, 'ws-workspace-ws-order-test-1-a');

  const updated = await repositories.webStudioChildSessions.updateChildSessionById({
    child_session_id: stored.child_session_id,
    patch: {
      status: 'running',
      updated_at: '2026-04-29T01:00:00.000Z',
    },
  });
  assert.strictEqual(updated.status, 'running');

  const state = await adapter.exportState();
  assert(state.webstudio_child_sessions, 'child session bucket must exist');

  console.log('fileBackedFirstGovernedWorkflowRepositoryAdapter webstudio child sessions test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
