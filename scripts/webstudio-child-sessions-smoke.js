const path = require('path');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioChildSessionService } = require('../backend/controlPlane/services/webStudio/webStudioChildSessionService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const childSessionService = createWebStudioChildSessionService({ repositories });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_child_sessions' });
  const sessions = await childSessionService.createChildSessionsForOrderVariants(demo.order_id);
  const surface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });

  assert(surface, 'surface must exist');
  assert.strictEqual(surface.variants.length, 3);
  assert.strictEqual(surface.child_sessions.length, 3);
  assert.strictEqual(sessions.length, 3);
  assert.strictEqual(new Set(sessions.map((row) => row.child_session_id)).size, 3);
  assert.strictEqual(new Set(sessions.map((row) => row.child_workspace_key)).size, 3);
  assert.deepStrictEqual(sessions.map((row) => row.branch_name), ['A', 'B', 'C']);
  assert(sessions.every((row) => row.isolation_mode !== 'shared_placeholder_not_allowed'));

  const variantA = surface.variants.find((row) => row.branch_name === 'A');
  const variantB = surface.variants.find((row) => row.branch_name === 'B');
  const variantC = surface.variants.find((row) => row.branch_name === 'C');
  const sessionA = surface.child_sessions.find((row) => row.branch_name === 'A');
  const sessionB = surface.child_sessions.find((row) => row.branch_name === 'B');
  const sessionC = surface.child_sessions.find((row) => row.branch_name === 'C');

  console.log(JSON.stringify({
    ok: true,
    order_id: surface.order.order_id,
    governed_flow_id: surface.taskflow_binding?.governed_flow_id || null,
    taskflow_id: surface.taskflow_binding?.taskflow_id || null,
    binding_id: surface.taskflow_binding?.binding_id || null,
    variant_A_id: variantA?.variant_id || null,
    variant_B_id: variantB?.variant_id || null,
    variant_C_id: variantC?.variant_id || null,
    child_session_A_id: sessionA?.child_session_id || null,
    child_session_B_id: sessionB?.child_session_id || null,
    child_session_C_id: sessionC?.child_session_id || null,
    child_agent_A_id: sessionA?.child_agent_id || null,
    child_agent_B_id: sessionB?.child_agent_id || null,
    child_agent_C_id: sessionC?.child_agent_id || null,
    workspace_A_key: sessionA?.child_workspace_key || null,
    workspace_B_key: sessionB?.child_workspace_key || null,
    workspace_C_key: sessionC?.child_workspace_key || null,
    child_sessions_count: surface.child_sessions.length,
    unique_child_session_ids: new Set(surface.child_sessions.map((row) => row.child_session_id)).size === 3,
    unique_workspace_keys: new Set(surface.child_sessions.map((row) => row.child_workspace_key)).size === 3,
    openclaw_native: sessionA?.openclaw_native || false,
    source: sessionA?.source || null,
    state_file: adapter.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
