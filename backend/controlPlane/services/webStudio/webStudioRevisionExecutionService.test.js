const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioRevisionExecutionService } = require('./webStudioRevisionExecutionService');

async function main() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-revision-execution-'));
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();

  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const executionService = createWebStudioRevisionExecutionService({ repositories, rootDir });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'test_webstudio_revision_execution' });
  const variantA = demo.surface.variants.find((row) => row.branch_name === 'A');
  const variantB = demo.surface.variants.find((row) => row.branch_name === 'B');
  const variantC = demo.surface.variants.find((row) => row.branch_name === 'C');

  await assert.rejects(
    executionService.executeLatestRevisionForOrder(demo.order_id),
    /Latest revision request not found/,
  );

  const revisionLane = await demoService.createDemoRevisionLane(
    demo.order_id,
    variantB.variant_id,
    'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.',
  );
  const revisionRequestId = revisionLane.revision_request_id;

  const storedRequestBefore = await repositories.webStudioRevisionRequests.getRevisionRequestById({ revision_request_id: revisionRequestId });
  assert.strictEqual(storedRequestBefore.parent_build_artifact_id, variantB.build_artifact_id);

  const preA = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: variantA.build_artifact_id });
  const preB = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: variantB.build_artifact_id });
  const preC = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: variantC.build_artifact_id });

  const result = await executionService.executeRevisionRequest(demo.order_id, revisionRequestId);
  assert.strictEqual(result.idempotent, false);
  assert(result.revised_build_artifact);
  assert.strictEqual(result.revised_build_artifact.parent_build_artifact_id, preB.build_artifact_id);
  assert.strictEqual(result.revised_build_artifact.revision_request_id, revisionRequestId);
  assert.strictEqual(result.revised_build_artifact.revision_native, false);
  assert.strictEqual(result.revised_build_artifact.artifact_type, 'revision');

  const revisedHtml = await fs.readFile(result.revised_build_artifact.html_path, 'utf8');
  assert(revisedHtml.includes('data-revision-request-id'));
  assert(revisedHtml.includes('Базовая структура сохранена'));

  const manifestRaw = await fs.readFile(result.revised_build_artifact.manifest_path, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  assert.strictEqual(manifest.revision_request_id, revisionRequestId);
  assert.strictEqual(manifest.parent_build_artifact_id, preB.build_artifact_id);
  assert.strictEqual(manifest.selected_variant_id, variantB.variant_id);
  assert.strictEqual(manifest.revision_native, false);
  assert.strictEqual(manifest.checks.non_selected_variants_unchanged, true);

  const storedRequestAfter = await repositories.webStudioRevisionRequests.getRevisionRequestById({ revision_request_id: revisionRequestId });
  assert.strictEqual(storedRequestAfter.status, 'completed');
  assert.strictEqual(storedRequestAfter.revision_execution_status, 'completed');
  assert.strictEqual(storedRequestAfter.revision_lane_status, 'completed');
  assert.strictEqual(storedRequestAfter.revised_build_artifact_id, result.revised_build_artifact.build_artifact_id);

  const orderAfter = await repositories.webStudioOrders.getOrderById({ order_id: demo.order_id });
  assert.strictEqual(orderAfter.revision_lane_status, 'completed');

  const postA = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: preA.build_artifact_id });
  const postB = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: preB.build_artifact_id });
  const postC = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: preC.build_artifact_id });
  assert.strictEqual(postA.html_path, preA.html_path);
  assert.strictEqual(postB.html_path, preB.html_path);
  assert.strictEqual(postC.html_path, preC.html_path);

  const second = await executionService.executeRevisionRequest(demo.order_id, revisionRequestId);
  assert.strictEqual(second.idempotent, true);
  assert.strictEqual(second.revised_build_artifact.build_artifact_id, result.revised_build_artifact.build_artifact_id);

  const surface = await executionService.getRevisionExecutionSurface(demo.order_id);
  assert.strictEqual(surface.revision_execution_status, 'completed');
  assert.strictEqual(surface.parent_build_artifact.build_artifact_id, preB.build_artifact_id);
  assert.strictEqual(surface.revised_build_artifact.build_artifact_id, result.revised_build_artifact.build_artifact_id);

  const otherDemo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'test_webstudio_revision_execution_other' });
  const foreignRevision = await demoService.createDemoRevisionLane(
    otherDemo.order_id,
    otherDemo.surface.variants.find((row) => row.branch_name === 'B').variant_id,
    'Сделать CTA заметнее',
  );
  await assert.rejects(
    executionService.executeRevisionRequest(demo.order_id, foreignRevision.revision_request_id),
    /does not belong to order/,
  );

  console.log('webStudioRevisionExecutionService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});