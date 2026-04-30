const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioPublicDeliveryService } = require('./webStudioPublicDeliveryService');

async function main() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-public-delivery-'));
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();

  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const publicDeliveryService = createWebStudioPublicDeliveryService({ repositories, rootDir });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'test_webstudio_public_delivery' });
  const variantB = demo.surface.variants.find((row) => row.branch_name === 'B');

  await demoService.createDemoRevisionLane(
    demo.order_id,
    variantB.variant_id,
    'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.',
  );
  await demoService.executeDemoRevision(demo.order_id);
  await demoService.runDemoRevisionBrowserQA(demo.order_id);

  const bundle = await publicDeliveryService.buildPublicDeliveryBundleForOrder(demo.order_id);
  assert.strictEqual(bundle.public_delivery_id, `ws-public-delivery-${demo.order_id}`);
  assert.strictEqual(bundle.initial_previews.length, 3);
  assert.strictEqual(bundle.hosting_native, false);
  assert.strictEqual(bundle.source, 'bounded_local_preview_publisher');
  assert(bundle.selected_preview);
  assert(bundle.revised_preview);

  for (const preview of bundle.initial_previews) {
    assert(await fs.stat(preview.published_html_path));
    assert(preview.preview_route_path.startsWith('/api/webstudio-preview/'));
  }
  assert(await fs.stat(bundle.revised_preview.published_html_path));

  const second = await publicDeliveryService.buildPublicDeliveryBundleForOrder(demo.order_id);
  assert.strictEqual(second.public_delivery_id, bundle.public_delivery_id);

  const fetched = await publicDeliveryService.getPublicDeliveryBundle(demo.order_id);
  assert.strictEqual(fetched.public_delivery_id, bundle.public_delivery_id);

  const surface = await publicDeliveryService.getPublicDeliverySurface(demo.order_id);
  assert.strictEqual(surface.public_delivery_bundle.public_delivery_id, bundle.public_delivery_id);
  assert.strictEqual(surface.initial_previews.length, 3);
  assert(surface.revised_preview);

  const artifact = { ...bundle.selected_preview, build_artifact_id: 'bad/../artifact', html_path: bundle.selected_preview.published_html_path };
  await assert.rejects(
    publicDeliveryService.publishPreviewArtifact({ order_id: demo.order_id }, artifact),
    /Unsafe artifactId/,
  );

  console.log('webStudioPublicDeliveryService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});