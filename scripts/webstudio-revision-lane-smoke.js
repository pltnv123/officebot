const path = require('path');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioRevisionService } = require('../backend/controlPlane/services/webStudio/webStudioRevisionService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const revisionService = createWebStudioRevisionService({ repositories });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_revision_lane' });
  const variantA = demo.surface.variants.find((row) => row.branch_name === 'A');
  const variantB = demo.surface.variants.find((row) => row.branch_name === 'B');
  const variantC = demo.surface.variants.find((row) => row.branch_name === 'C');

  const preAArtifact = variantA.build_artifact_id;
  const preCArtifact = variantC.build_artifact_id;

  await revisionService.selectVariantForOrder(demo.order_id, variantB.variant_id);
  const revisionRequest = await revisionService.createRevisionRequest(
    demo.order_id,
    variantB.variant_id,
    'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.',
  );

  const surface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });
  assert(surface, 'surface must exist');
  assert.strictEqual(surface.variants.length, 3);
  assert.strictEqual(surface.build_artifacts.length, 3);
  assert.strictEqual(surface.browser_qa_evidence.length, 3);
  assert.strictEqual(surface.selected_variant_id, variantB.variant_id);
  assert(surface.selected_variant);
  assert.strictEqual(surface.selected_variant.variant_id, variantB.variant_id);
  assert(surface.revision_requests.length >= 1);
  assert(surface.latest_revision_request);
  assert.strictEqual(surface.latest_revision_request.selected_variant_id, variantB.variant_id);
  assert.strictEqual(surface.latest_revision_request.build_artifact_id, variantB.build_artifact_id);
  assert.strictEqual(surface.latest_revision_request.browser_evidence_id, variantB.browser_evidence_id);
  assert(['ready', 'pending_execution'].includes(surface.revision_lane.status));

  const postA = surface.variants.find((row) => row.branch_name === 'A');
  const postB = surface.variants.find((row) => row.branch_name === 'B');
  const postC = surface.variants.find((row) => row.branch_name === 'C');
  const nonSelectedVariantsUnchanged = postA.build_artifact_id === preAArtifact && postC.build_artifact_id === preCArtifact && postB.build_artifact_id === variantB.build_artifact_id;
  assert(nonSelectedVariantsUnchanged);

  console.log(JSON.stringify({
    ok: true,
    order_id: surface.order.order_id,
    governed_flow_id: surface.taskflow_binding?.governed_flow_id || null,
    taskflow_id: surface.taskflow_binding?.taskflow_id || null,
    binding_id: surface.taskflow_binding?.binding_id || null,
    variant_A_id: variantA.variant_id,
    variant_B_id: variantB.variant_id,
    variant_C_id: variantC.variant_id,
    selected_variant_id: surface.selected_variant_id,
    revision_request_id: revisionRequest.revision_request_id,
    revision_number: revisionRequest.revision_number,
    selected_build_artifact_id: revisionRequest.build_artifact_id,
    selected_browser_evidence_id: revisionRequest.browser_evidence_id,
    revision_lane_status: surface.revision_lane.status,
    surface_includes_selected_variant: Boolean(surface.selected_variant),
    surface_includes_revision_lane: Boolean(surface.revision_lane),
    non_selected_variants_unchanged: nonSelectedVariantsUnchanged,
    state_file: adapter.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
