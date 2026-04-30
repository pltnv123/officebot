const fs = require('fs/promises');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioPrimaryVariantService } = require('../backend/controlPlane/services/webStudio/webStudioPrimaryVariantService');
const { renderWebStudioDemoPage } = require('../backend/webStudioDemoPage');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoPackagingService = createWebStudioDemoPackagingService({ repositories });
  const primaryVariantService = createWebStudioPrimaryVariantService({ repositories });

  const demo = await demoPackagingService.materializeDemoOrderWithThreeVariants({ order_id: 'ws-order-demo-0001' });
  await primaryVariantService.markPrimaryVariantForOrder(demo.order_id, 'B');
  await primaryVariantService.upgradePrimaryVariantBuildQuality(demo.order_id);
  await primaryVariantService.ensurePrimaryRevisionPath(demo.order_id);
  await demoPackagingService.createDemoRevisionLane(demo.order_id, demo.surface.variants.find((row) => row.branch_name === 'B').variant_id, {
    requested_changes: ['Усилить hero и CTA'],
    customer_notes: 'Нужен более сильный first screen',
  });
  await demoPackagingService.executeDemoRevision(demo.order_id);
  await demoPackagingService.runDemoRevisionBrowserQA(demo.order_id);
  const publicDelivery = await demoPackagingService.buildDemoPublicDelivery(demo.order_id);
  const surface = publicDelivery.surface;
  const html = renderWebStudioDemoPage({ orderId: demo.order_id });
  const pagePath = path.join(rootDir, 'backend', 'webStudioDemoPage.js');
  const pageExists = await fs.access(pagePath).then(() => true).catch(() => false);

  console.log(JSON.stringify({
    ok: true,
    order_id: demo.order_id,
    demo_ui_available: pageExists && html.includes('WebStudio MVP Demo'),
    primary_variant_branch: surface.primary_variant?.branch_name || null,
    primary_preview_available: Boolean(surface.primary_variant?.preview_path),
    variant_A_placeholder: surface.placeholder_variants?.some((row) => row.branch_name === 'A' && row.production_ready === false) || false,
    variant_C_placeholder: surface.placeholder_variants?.some((row) => row.branch_name === 'C' && row.production_ready === false) || false,
    public_delivery_id: surface.public_delivery_bundle?.public_delivery_id || null,
    revision_flow_available: Boolean(surface.selected_variant_id && surface.latest_revision_request?.revision_request_id),
    revised_preview_available: Boolean(surface.revision_lane?.public_delivery_revision_available),
    hosting_native: Boolean(surface.public_delivery_bundle?.hosting_native),
    no_fake_production_claim: Boolean(surface.placeholder_variants?.every((row) => row.production_ready === false)),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});