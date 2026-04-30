const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoPackagingService = createWebStudioDemoPackagingService({ repositories });

  const demo = await demoPackagingService.materializeDemoOrderWithThreeVariants({ order_id: 'ws-order-demo-0001' });
  const initialSurface = demo.surface;
  const variantB = initialSurface.variants.find((row) => row.branch_name === 'B');
  const variantA = initialSurface.variants.find((row) => row.branch_name === 'A');
  const variantC = initialSurface.variants.find((row) => row.branch_name === 'C');

  await demoPackagingService.createDemoRevisionLane(demo.order_id, variantB.variant_id, {
    requested_changes: ['Усилить первый экран', 'Сделать CTA заметнее'],
    customer_notes: 'Нужно больше доверия рядом с оффером',
  });
  await demoPackagingService.executeDemoRevision(demo.order_id);
  await demoPackagingService.runDemoRevisionBrowserQA(demo.order_id);
  const publicDelivery = await demoPackagingService.buildDemoPublicDelivery(demo.order_id);

  const surface = publicDelivery.surface;
  const primaryVariant = surface.primary_variant;
  const placeholderVariants = surface.placeholder_variants || [];
  const refreshedA = surface.variants.find((row) => row.branch_name === 'A');
  const refreshedC = surface.variants.find((row) => row.branch_name === 'C');
  const refreshedB = surface.variants.find((row) => row.branch_name === 'B');

  if (!primaryVariant || primaryVariant.branch_name !== 'B') throw new Error('Primary variant must be B');
  if (!refreshedB.build_artifact_id) throw new Error('Primary variant build artifact missing');
  if (!refreshedB.preview_path) throw new Error('Primary preview path missing');
  if (!refreshedB.revised_build_artifact_id) throw new Error('Primary revised artifact missing');
  if (!refreshedA || refreshedA.implementation_status !== 'placeholder') throw new Error('Variant A must remain placeholder');
  if (!refreshedC || refreshedC.implementation_status !== 'placeholder') throw new Error('Variant C must remain placeholder');
  if (refreshedA.production_ready || refreshedC.production_ready) throw new Error('Placeholder variants must not claim production readiness');
  if (!placeholderVariants.every((row) => row.placeholder_reason)) throw new Error('Placeholder variants must include placeholder reason');

  console.log(JSON.stringify({
    ok: true,
    order_id: demo.order_id,
    primary_variant_branch: primaryVariant.branch_name,
    primary_variant_id: primaryVariant.variant_id,
    primary_build_artifact_id: refreshedB.build_artifact_id,
    primary_preview_exists: Boolean(refreshedB.preview_path),
    variant_A_placeholder: refreshedA.implementation_status === 'placeholder',
    variant_C_placeholder: refreshedC.implementation_status === 'placeholder',
    primary_revision_available: Boolean(surface.revision_lane?.revised_build_artifact_id),
    delivery_surface_marks_primary: surface.public_delivery_bundle?.primary_variant?.branch_name === 'B',
    no_fake_production_claim_for_placeholders: !refreshedA.production_ready && !refreshedC.production_ready,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});