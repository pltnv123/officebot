const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioRevisionBrowserQAService } = require('./webStudioRevisionBrowserQAService');

async function main() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-revision-browser-qa-'));
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();

  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const revisionBrowserQAService = createWebStudioRevisionBrowserQAService({ repositories, rootDir });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'test_webstudio_revision_browser_qa' });
  const variantA = demo.surface.variants.find((row) => row.branch_name === 'A');
  const variantB = demo.surface.variants.find((row) => row.branch_name === 'B');
  const variantC = demo.surface.variants.find((row) => row.branch_name === 'C');

  await assert.rejects(
    revisionBrowserQAService.runBrowserQAForLatestRevision(demo.order_id),
    /Latest revision request not found/,
  );

  const lane = await demoService.createDemoRevisionLane(
    demo.order_id,
    variantB.variant_id,
    'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.',
  );

  await assert.rejects(
    revisionBrowserQAService.runBrowserQAForRevisionRequest(demo.order_id, lane.revision_request_id),
    /must be completed before revised browser QA/,
  );

  await demoService.executeDemoRevision(demo.order_id);

  const preA = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: variantA.browser_evidence_id });
  const preC = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: variantC.browser_evidence_id });

  const result = await revisionBrowserQAService.runBrowserQAForLatestRevision(demo.order_id);
  assert.strictEqual(result.idempotent, false);
  assert(result.revised_browser_evidence);
  assert.strictEqual(result.revised_browser_evidence.evidence_scope, 'revision');
  assert.strictEqual(result.revised_browser_evidence.selected_variant_id, variantB.variant_id);
  assert.strictEqual(result.revised_browser_evidence.revised_build_artifact_id, result.revision_request.revised_build_artifact_id);
  assert.strictEqual(result.revised_browser_evidence.browser_native, false);
  assert.strictEqual(result.revised_browser_evidence.source, 'bounded_revised_preview_target_browser_evidence');
  assert(result.revised_browser_evidence.checks.some((check) => check.check_id === 'revised_preview_target_exists'));
  assert(result.revised_browser_evidence.checks.some((check) => check.check_id === 'revision_delta_reflected'));

  const updatedRequest = await repositories.webStudioRevisionRequests.getRevisionRequestById({ revision_request_id: lane.revision_request_id });
  assert.strictEqual(updatedRequest.revised_browser_evidence_id, result.revised_browser_evidence.browser_evidence_id);
  assert.strictEqual(updatedRequest.revised_browser_qa_status, result.revised_browser_evidence.status);
  assert.strictEqual(updatedRequest.revised_capture_status, result.revised_browser_evidence.capture_status);
  assert.strictEqual(updatedRequest.revised_browser_native, false);

  const postA = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: variantA.browser_evidence_id });
  const postC = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: variantC.browser_evidence_id });
  assert.deepStrictEqual(postA, preA);
  assert.deepStrictEqual(postC, preC);

  const second = await revisionBrowserQAService.runBrowserQAForLatestRevision(demo.order_id);
  assert.strictEqual(second.idempotent, true);
  assert.strictEqual(second.revised_browser_evidence.browser_evidence_id, result.revised_browser_evidence.browser_evidence_id);

  const surface = await revisionBrowserQAService.getRevisionBrowserQASurface(demo.order_id);
  assert.strictEqual(surface.revised_browser_evidence.browser_evidence_id, result.revised_browser_evidence.browser_evidence_id);
  assert.strictEqual(surface.browser_native, false);

  console.log('webStudioRevisionBrowserQAService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});