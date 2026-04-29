const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioChildSessionService } = require('./webStudioChildSessionService');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-child-session-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const childSessionService = createWebStudioChildSessionService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'child-session-test' });
  const orderId = demo.order_id;
  const variants = demo.surface.variants;

  const sessions = await childSessionService.createChildSessionsForOrderVariants(orderId);
  assert.strictEqual(sessions.length, 3);
  assert.deepStrictEqual(sessions.map((row) => row.branch_name), ['A', 'B', 'C']);
  assert.strictEqual(new Set(sessions.map((row) => row.child_session_id)).size, 3);
  assert.strictEqual(new Set(sessions.map((row) => row.child_workspace_key)).size, 3);
  assert.strictEqual(new Set(sessions.map((row) => row.child_agent_id)).size, 3);
  assert(sessions.every((row) => row.openclaw_native === false));
  assert(sessions.every((row) => row.execution_spec && row.execution_spec.design_direction));
  assert(sessions[0].governed_flow_id, 'must preserve governed_flow_id');
  assert(sessions[0].taskflow_id, 'must preserve taskflow_id');

  const secondPass = await childSessionService.createChildSessionsForOrderVariants(orderId);
  assert.strictEqual(secondPass.length, 3);
  assert.deepStrictEqual(secondPass.map((row) => row.child_session_id), sessions.map((row) => row.child_session_id));

  let rejectedUnknownVariant = false;
  try {
    await childSessionService.createChildSessionForVariant(orderId, 'missing-variant');
  } catch {
    rejectedUnknownVariant = true;
  }
  assert(rejectedUnknownVariant, 'must reject unknown variant');

  const foreignOrder = await demoService.materializeDemoOrderWithThreeVariants({ source: 'child-session-test-2' });
  let rejectedForeignVariant = false;
  try {
    await childSessionService.createChildSessionForVariant(orderId, foreignOrder.surface.variants[0].variant_id);
  } catch {
    rejectedForeignVariant = true;
  }
  assert(rejectedForeignVariant, 'must reject variant from another order');

  const byVariant = await childSessionService.getChildSessionForVariant(variants[1].variant_id);
  assert(byVariant, 'must fetch child session by variant');
  assert.strictEqual(byVariant.branch_name, 'B');

  console.log('webStudioChildSessionService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
