const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioPrimaryVariantService } = require('./webStudioPrimaryVariantService');
const { createWebStudioOrderSurfaceService } = require('./webStudioOrderSurfaceService');
const { createWebStudioRevisionService } = require('./webStudioRevisionService');
const { createWebStudioBuildArtifactService } = require('./webStudioBuildArtifactService');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-primary-variant-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoPackagingService = createWebStudioDemoPackagingService({ repositories });
  const primaryVariantService = createWebStudioPrimaryVariantService({ repositories });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });
  const revisionService = createWebStudioRevisionService({ repositories });
  const buildArtifactService = createWebStudioBuildArtifactService({ repositories, rootDir });

  const demo = await demoPackagingService.materializeDemoOrderWithThreeVariants({ order_id: 'ws-order-demo-0001' });
  const orderId = demo.order_id;

  const marked = await primaryVariantService.markPrimaryVariantForOrder(orderId);
  assert.strictEqual(marked.primary_variant.branch_name, 'B');
  assert.strictEqual(marked.placeholder_variants.length, 2);

  const markedAgain = await primaryVariantService.markPrimaryVariantForOrder(orderId);
  assert.strictEqual(markedAgain.primary_variant.variant_id, marked.primary_variant.variant_id);

  const primary = await primaryVariantService.getPrimaryVariantForOrder(orderId);
  assert.strictEqual(primary.primary_variant.branch_name, 'B');
  assert(primary.validation_summary.has_primary_variant);
  assert(primary.validation_summary.placeholder_count === 2);

  const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
  const variantA = variants.find((row) => row.branch_name === 'A');
  const variantB = variants.find((row) => row.branch_name === 'B');
  const variantC = variants.find((row) => row.branch_name === 'C');

  assert.strictEqual(variantB.implementation_status, 'real');
  assert.strictEqual(variantB.quality_level, 'primary');
  assert.strictEqual(variantB.is_primary_recommendation, true);
  assert.strictEqual(variantB.production_ready, false);
  assert.strictEqual(variantA.implementation_status, 'placeholder');
  assert.strictEqual(variantC.implementation_status, 'placeholder');
  assert.strictEqual(variantA.production_ready, false);
  assert.strictEqual(variantC.production_ready, false);

  const buildA = await repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: variantA.variant_id });
  const buildB = await repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: variantB.variant_id });
  const buildC = await repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: variantC.variant_id });
  const htmlA = await fs.readFile(buildA.html_path, 'utf8');
  const htmlB = await fs.readFile(buildB.html_path, 'utf8');
  const htmlC = await fs.readFile(buildC.html_path, 'utf8');

  assert(htmlB.includes('data-quality-level="primary"'));
  assert(htmlB.includes('data-implementation-status="real"'));
  assert(htmlB.includes('Что входит'));
  assert(htmlB.includes('Запросить демонстрацию'));
  assert(htmlB.includes('Готовы перейти к следующему шагу?'));
  assert(htmlA.includes('PLACEHOLDER'));
  assert(htmlC.includes('PLACEHOLDER'));

  const rebuilt = await primaryVariantService.upgradePrimaryVariantBuildQuality(orderId);
  assert.strictEqual(rebuilt.branch_name, 'B');
  const buildBAgain = await repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: variantB.variant_id });
  assert.strictEqual(buildBAgain.build_artifact_id, buildB.build_artifact_id);

  await primaryVariantService.ensurePrimaryRevisionPath(orderId);
  const selectedOrder = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
  assert.strictEqual(selectedOrder.selected_variant_id, variantB.variant_id);

  const surface = await surfaceService.buildOrderSurface({ order_id: orderId });
  assert(surface.primary_variant);
  assert.strictEqual(surface.primary_variant.branch_name, 'B');
  assert(Array.isArray(surface.placeholder_variants));
  assert.strictEqual(surface.placeholder_variants.length, 2);
  assert.strictEqual(surface.mvp_delivery_status.primary_variant_ready, true);
  assert.strictEqual(surface.mvp_delivery_status.placeholders_are_not_production_ready, true);

  const enforced = await primaryVariantService.enforcePrimaryVariantDeliveryPolicy(orderId);
  assert.strictEqual(enforced.primary_variant.branch_name, 'B');
  assert.strictEqual(enforced.delivery_recommendation, 'Use Variant B as the first real MVP preview');

  await revisionService.createRevisionRequest(orderId, variantB.variant_id, { requested_changes: ['Tighten CTA'] });
  const latestRevision = await revisionService.getLatestRevisionRequest(orderId);
  assert.strictEqual(latestRevision.selected_variant_id, variantB.variant_id);

  const rootDirNoB = await mkTempRoot();
  const adapterNoB = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir: rootDirNoB });
  await adapterNoB.clearRuntimeState();
  const repositoriesNoB = adapterNoB.repositories;
  const demoPackagingServiceNoB = createWebStudioDemoPackagingService({ repositories: repositoriesNoB });
  const demoNoB = await demoPackagingServiceNoB.materializeDemoOrderWithThreeVariants({ order_id: 'ws-order-demo-0099' });
  const primaryVariantServiceNoB = createWebStudioPrimaryVariantService({ repositories: repositoriesNoB });
  const variantsNoB = await repositoriesNoB.webStudioVariants.listVariantsByOrderId({ order_id: demoNoB.order_id });
  const variantBNoB = variantsNoB.find((row) => row.branch_name === 'B');
  if (!variantBNoB) throw new Error('Expected B variant in no-B setup before mutation');
  await repositoriesNoB.webStudioVariants.updateVariantById({ variant_id: variantBNoB.variant_id, patch: { branch_name: 'Z' } });
  let missingBError = null;
  try {
    await primaryVariantServiceNoB.markPrimaryVariantForOrder(demoNoB.order_id);
  } catch (error) {
    missingBError = error;
  }
  assert(missingBError);

  console.log('webStudioPrimaryVariantService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});