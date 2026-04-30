const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioPublicDeliveryService } = require('../backend/controlPlane/services/webStudio/webStudioPublicDeliveryService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;

  const demoService = createWebStudioDemoPackagingService({ repositories });
  const publicDeliveryService = createWebStudioPublicDeliveryService({ repositories, rootDir });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_public_delivery' });
  const variantB = demo.surface.variants.find((row) => row.branch_name === 'B');

  await demoService.createDemoRevisionLane(
    demo.order_id,
    variantB.variant_id,
    'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.',
  );
  await demoService.executeDemoRevision(demo.order_id);
  await demoService.runDemoRevisionBrowserQA(demo.order_id);
  const bundle = await publicDeliveryService.buildPublicDeliveryBundleForOrder(demo.order_id);
  const surface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });

  assert(bundle.public_delivery_id);
  assert.strictEqual(bundle.initial_previews.length, 3);
  assert(bundle.initial_previews.every((row) => row.published_html_path));
  assert(bundle.initial_previews.every((row) => fs.existsSync(row.published_html_path)));
  assert(surface.selected_variant_id);
  assert(bundle.revised_preview);
  assert(bundle.revised_preview.published_html_path);
  assert(fs.existsSync(bundle.revised_preview.published_html_path));
  assert.strictEqual(bundle.hosting_native, false);
  assert.strictEqual(bundle.source, 'bounded_local_preview_publisher');
  assert(surface.public_delivery_bundle);

  console.log(JSON.stringify({
    ok: true,
    order_id: demo.order_id,
    public_delivery_id: bundle.public_delivery_id,
    initial_previews_count: bundle.initial_previews.length,
    selected_variant_id: bundle.selected_variant_id,
    revision_request_id: bundle.revision_request_id,
    revised_build_artifact_id: bundle.revised_preview?.revised_build_artifact_id || null,
    revised_preview_available: Boolean(bundle.revised_preview),
    all_initial_preview_files_exist: bundle.initial_previews.every((row) => fs.existsSync(row.published_html_path)),
    revised_preview_file_exists: Boolean(bundle.revised_preview?.published_html_path && fs.existsSync(bundle.revised_preview.published_html_path)),
    hosting_native: bundle.hosting_native,
    source: bundle.source,
    surface_includes_public_delivery: Boolean(surface.public_delivery_bundle),
    state_file: adapter.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});