const path = require('path');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioPrimaryVariantService } = require('../backend/controlPlane/services/webStudio/webStudioPrimaryVariantService');
const { createWebStudioRevisionService } = require('../backend/controlPlane/services/webStudio/webStudioRevisionService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');
const { renderWebStudioDemoPage } = require('../backend/webStudioDemoPage');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoPackagingService = createWebStudioDemoPackagingService({ repositories });
  const primaryVariantService = createWebStudioPrimaryVariantService({ repositories });
  const revisionService = createWebStudioRevisionService({ repositories });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoPackagingService.materializeDemoOrderWithThreeVariants({ order_id: 'ws-order-demo-0001' });
  await primaryVariantService.markPrimaryVariantForOrder(demo.order_id, 'B');
  await primaryVariantService.upgradePrimaryVariantBuildQuality(demo.order_id);
  const selectPrimary = await primaryVariantService.ensurePrimaryRevisionPath(demo.order_id);
  const primary = await primaryVariantService.getPrimaryVariantForOrder(demo.order_id);
  const revision = await revisionService.createRevisionRequest(
    demo.order_id,
    primary.primary_variant.variant_id,
    { requested_changes: ['Усилить hero и CTA'], customer_notes: 'Нужен более сильный first screen' },
  );
  const execution = await demoPackagingService.executeDemoRevision(demo.order_id);
  await demoPackagingService.runDemoRevisionBrowserQA(demo.order_id);
  const publicDelivery = await demoPackagingService.buildDemoPublicDelivery(demo.order_id);
  const surface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });
  const html = renderWebStudioDemoPage({ orderId: demo.order_id });

  assert(demo.order_id);
  assert(surface.order?.order_id === demo.order_id);
  assert(selectPrimary.selected_variant_id);
  assert(revision.revision_request_id);
  assert(execution.execution?.revised_build_artifact?.build_artifact_id);
  assert(publicDelivery.surface?.revision_lane);
  assert(html.includes('payload?.order_id || payload?.orderId || payload?.order?.order_id'));
  assert(html.includes('Order ID is empty. Click Create / Load Demo Order first.'));
  assert(!html.includes('/api/demo/webstudio-order//select-primary'));

  console.log(JSON.stringify({
    ok: true,
    order_id: demo.order_id,
    select_primary_ok: Boolean(selectPrimary.selected_variant_id),
    revision_ok: Boolean(revision.revision_request_id),
    execute_revision_ok: Boolean(execution.execution?.revised_build_artifact?.build_artifact_id),
    surface_ok: surface.order?.order_id === demo.order_id,
    no_double_slash_route: !html.includes('/api/demo/webstudio-order//select-primary'),
    public_delivery_id: publicDelivery.bundle?.public_delivery_id || null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
