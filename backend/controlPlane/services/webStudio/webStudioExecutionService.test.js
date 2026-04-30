const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioExecutionService } = require('./webStudioExecutionService');
const { createWebStudioOrderSurfaceService } = require('./webStudioOrderSurfaceService');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-execution-service-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoPackagingService = createWebStudioDemoPackagingService({ repositories });
  const executionService = createWebStudioExecutionService({ repositories });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoPackagingService.materializeDemoOrderWithThreeVariants({ order_id: 'ws-order-demo-0001' });
  const orderId = demo.order_id;
  const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
  const variantA = variants.find((row) => row.branch_name === 'A');
  const variantB = variants.find((row) => row.branch_name === 'B');

  const capability = await executionService.detectWebStudioExecutionCapability();
  assert.strictEqual(capability.available, false);
  assert.strictEqual(capability.provider, 'bounded_local');
  assert.strictEqual(capability.openclaw_native, false);
  assert(capability.reason.includes('bounded local') || capability.reason.includes('bounded local execution adapter'));

  const revisionService = require('./webStudioRevisionService').createWebStudioRevisionService({ repositories });
  await revisionService.selectVariantForOrder(orderId, variantB.variant_id);

  const runA = await executionService.createExecutionRunForVariant(orderId, variantA.variant_id);
  assert.strictEqual(runA.variant_id, variantA.variant_id);
  assert(runA.child_session_id);
  assert.strictEqual(runA.source, 'bounded_local_execution_adapter');
  assert.strictEqual(runA.provider, 'bounded_local');
  assert.strictEqual(runA.openclaw_native, false);
  assert(runA.execution_output.execution_spec_hash);
  assert(Array.isArray(runA.execution_output.planned_artifacts));

  const runASecond = await executionService.createExecutionRunForVariant(orderId, variantA.variant_id);
  assert.strictEqual(runASecond.execution_run_id, runA.execution_run_id);

  const selectedRuns = await executionService.createExecutionRunsForOrderVariants(orderId, { scope: 'selected' });
  assert.strictEqual(selectedRuns.length, 1);
  assert.strictEqual(selectedRuns[0].variant_id, variantB.variant_id);

  const allRuns = await executionService.getExecutionRunsForOrder(orderId);
  assert.strictEqual(allRuns.length, 2);

  const surface = await surfaceService.buildOrderSurface({ order_id: orderId });
  assert(Array.isArray(surface.execution_runs));
  assert(surface.execution_runs.length >= 2);
  const variantSurfaceA = surface.variants.find((row) => row.variant_id === variantA.variant_id);
  assert.strictEqual(variantSurfaceA.execution_run_id, runA.execution_run_id);
  assert.strictEqual(variantSurfaceA.execution_source, 'bounded_local_execution_adapter');
  assert.strictEqual(variantSurfaceA.openclaw_native_execution, false);

  await executionService.linkExecutionRunToBuildArtifact(orderId, runA.execution_run_id, variantA.build_artifact_id);
  const linked = await repositories.webStudioExecutionRuns.getExecutionRunById({ execution_run_id: runA.execution_run_id });
  assert.strictEqual(linked.related_build_artifact_id, variantA.build_artifact_id);

  let unknownVariantError = null;
  try {
    await executionService.createExecutionRunForVariant(orderId, 'ws-variant-missing');
  } catch (error) {
    unknownVariantError = error;
  }
  assert(unknownVariantError);
  assert(unknownVariantError.message.includes('variant'));

  const rootDirNoChild = await mkTempRoot();
  const adapterNoChild = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir: rootDirNoChild });
  await adapterNoChild.clearRuntimeState();
  const repositoriesNoChild = adapterNoChild.repositories;
  const demoPackagingServiceNoChild = createWebStudioDemoPackagingService({ repositories: repositoriesNoChild });
  const executionServiceNoChild = createWebStudioExecutionService({ repositories: repositoriesNoChild });
  const demoNoChild = await demoPackagingServiceNoChild.createDemoWebStudioOrder({ order_id: 'ws-order-demo-0002' });
  const orderNoChildId = demoNoChild.order_id;
  const normalizedOrder = await repositoriesNoChild.webStudioOrders.getOrderById({ order_id: orderNoChildId });
  const variantService = require('./webStudioVariantService').createWebStudioVariantService({ repositories: repositoriesNoChild });
  const taskflowService = require('./webStudioTaskFlowBindingService').createWebStudioTaskFlowBindingService({ repositories: repositoriesNoChild });
  await variantService.createThreeVariants(normalizedOrder, {});
  await taskflowService.bindOrderToGovernedFlow(orderNoChildId, { fallback_order: normalizedOrder });
  const variantsNoChild = await repositoriesNoChild.webStudioVariants.listVariantsByOrderId({ order_id: orderNoChildId });

  let missingChildError = null;
  try {
    await executionServiceNoChild.createExecutionRunForVariant(orderNoChildId, variantsNoChild[0].variant_id);
  } catch (error) {
    missingChildError = error;
  }
  assert(missingChildError);
  assert(missingChildError.message.includes('Child session missing'));

  const source = await fs.readFile(path.join(__dirname, 'webStudioExecutionService.js'), 'utf8');
  assert(!source.includes('autonomous_loop'));

  console.log('webStudioExecutionService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});