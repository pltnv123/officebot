const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioRevisionService } = require('./webStudioRevisionService');

async function main() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-revision-service-'));
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();

  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const revisionService = createWebStudioRevisionService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'test_webstudio_revision' });
  const variants = demo.surface.variants;
  const variantA = variants.find((row) => row.branch_name === 'A');
  const variantB = variants.find((row) => row.branch_name === 'B');
  const variantC = variants.find((row) => row.branch_name === 'C');

  const selected = await revisionService.selectVariantForOrder(demo.order_id, variantB.variant_id);
  assert.strictEqual(selected.order.selected_variant_id, variantB.variant_id);
  assert.strictEqual(selected.binding.selected_variant_id, variantB.variant_id);
  assert.strictEqual(selected.delivery.selected_variant_id, variantB.variant_id);

  const idempotent = await revisionService.selectVariantForOrder(demo.order_id, variantB.variant_id);
  assert.strictEqual(idempotent.idempotent, true);

  await assert.rejects(
    revisionService.selectVariantForOrder(demo.order_id, variantA.variant_id),
    /already selected different variant/,
  );

  await assert.rejects(
    revisionService.selectVariantForOrder(demo.order_id, 'missing-variant'),
    /Selected variant does not belong to order/,
  );

  const otherDemo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'test_webstudio_revision_other' });
  const foreignVariant = otherDemo.surface.variants.find((row) => row.branch_name === 'B');
  await assert.rejects(
    revisionService.selectVariantForOrder(demo.order_id, foreignVariant.variant_id),
    /Selected variant does not belong to order/,
  );

  await assert.rejects(
    revisionService.createRevisionRequest(otherDemo.order_id, foreignVariant.variant_id, ''),
    /Revision delta brief must be non-empty/,
  );

  const revisionRequest = await revisionService.createRevisionRequest(
    demo.order_id,
    variantB.variant_id,
    'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.',
  );
  assert.strictEqual(revisionRequest.selected_variant_id, variantB.variant_id);
  assert.strictEqual(revisionRequest.revision_number, 1);
  assert(revisionRequest.child_session_id);
  assert(revisionRequest.build_artifact_id);
  assert(revisionRequest.browser_evidence_id);

  const sameRevision = await revisionService.createRevisionRequest(
    demo.order_id,
    variantB.variant_id,
    'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.',
  );
  assert.strictEqual(sameRevision.revision_request_id, revisionRequest.revision_request_id);

  const secondRevision = await revisionService.createRevisionRequest(demo.order_id, variantB.variant_id, {
    requested_changes: ['Добавить короткий proof block'],
    priority: 'high',
    affected_sections: ['hero', 'social_proof'],
    constraints: ['preserve_base_structure'],
    customer_notes: 'Нужно больше доверия на первом экране.',
    acceptance_delta: ['CTA should stand out more clearly'],
  });
  assert.strictEqual(secondRevision.revision_number, 2);

  const latest = await revisionService.getLatestRevisionRequest(demo.order_id);
  assert.strictEqual(latest.revision_request_id, secondRevision.revision_request_id);

  const surface = await revisionService.getRevisionSurface(demo.order_id);
  assert.strictEqual(surface.selected_variant.variant_id, variantB.variant_id);
  assert.strictEqual(surface.latest_revision_request.revision_request_id, secondRevision.revision_request_id);
  assert.strictEqual(surface.revision_lane.status, 'ready');

  const postSurface = await demoService.buildDemoDeliverySurface({ order_id: demo.order_id });
  assert.strictEqual(postSurface.selected_variant_id, variantB.variant_id);
  assert.strictEqual(postSurface.selected_variant.variant_id, variantB.variant_id);
  assert(postSurface.revision_requests.length >= 2);
  assert(postSurface.latest_revision_request.revision_request_id === secondRevision.revision_request_id);
  assert(postSurface.revision_lane.status === 'ready');

  const finalVariants = postSurface.variants;
  const finalA = finalVariants.find((row) => row.variant_id === variantA.variant_id);
  const finalB = finalVariants.find((row) => row.variant_id === variantB.variant_id);
  const finalC = finalVariants.find((row) => row.variant_id === variantC.variant_id);
  assert.strictEqual(finalA.build_artifact_id, variantA.build_artifact_id);
  assert.strictEqual(finalC.build_artifact_id, variantC.build_artifact_id);
  assert.strictEqual(finalB.build_artifact_id, variantB.build_artifact_id);

  console.log('webStudioRevisionService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
