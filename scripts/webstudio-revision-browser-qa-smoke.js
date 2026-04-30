const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioRevisionBrowserQAService } = require('../backend/controlPlane/services/webStudio/webStudioRevisionBrowserQAService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;

  const demoService = createWebStudioDemoPackagingService({ repositories });
  const revisionBrowserQAService = createWebStudioRevisionBrowserQAService({ repositories, rootDir });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_revision_browser_qa' });
  const variantA = demo.surface.variants.find((row) => row.branch_name === 'A');
  const variantB = demo.surface.variants.find((row) => row.branch_name === 'B');
  const variantC = demo.surface.variants.find((row) => row.branch_name === 'C');

  const preABrowserEvidenceId = variantA.browser_evidence_id;
  const preCBrowserEvidenceId = variantC.browser_evidence_id;

  await demoService.createDemoRevisionLane(
    demo.order_id,
    variantB.variant_id,
    'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.',
  );
  await demoService.executeDemoRevision(demo.order_id);

  const execution = await revisionBrowserQAService.runBrowserQAForLatestRevision(demo.order_id);
  const surface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });
  const latest = surface.latest_revision_request;
  const revisedEvidence = execution.revised_browser_evidence;
  const postA = surface.variants.find((row) => row.branch_name === 'A');
  const postC = surface.variants.find((row) => row.branch_name === 'C');

  assert(latest.revised_build_artifact_id);
  assert(fs.existsSync(revisedEvidence.html_path));
  assert(latest.revised_browser_evidence_id);
  assert.strictEqual(revisedEvidence.evidence_scope, 'revision');
  assert.strictEqual(revisedEvidence.selected_variant_id, surface.selected_variant_id);
  assert.strictEqual(revisedEvidence.revised_build_artifact_id, latest.revised_build_artifact_id);
  assert.strictEqual(postA.browser_evidence_id, preABrowserEvidenceId);
  assert.strictEqual(postC.browser_evidence_id, preCBrowserEvidenceId);
  assert(Array.isArray(surface.revised_browser_qa_evidence));
  assert(surface.revised_browser_qa_evidence.some((row) => row.browser_evidence_id === revisedEvidence.browser_evidence_id));
  if (revisedEvidence.browser_native) {
    assert(revisedEvidence.screenshot_path);
    assert(fs.existsSync(revisedEvidence.screenshot_path));
  } else {
    assert.strictEqual(revisedEvidence.source, 'bounded_revised_preview_target_browser_evidence');
    assert(Array.isArray(revisedEvidence.limitations));
    assert(revisedEvidence.limitations.length > 0);
  }

  console.log(JSON.stringify({
    ok: true,
    order_id: surface.order.order_id,
    selected_variant_id: surface.selected_variant_id,
    revision_request_id: latest.revision_request_id,
    revision_number: latest.revision_number,
    revised_build_artifact_id: latest.revised_build_artifact_id,
    revised_browser_evidence_id: latest.revised_browser_evidence_id,
    revised_html_path: revisedEvidence.html_path,
    revised_html_exists: fs.existsSync(revisedEvidence.html_path),
    evidence_scope: revisedEvidence.evidence_scope,
    revised_browser_qa_status: latest.revised_browser_qa_status,
    revised_capture_status: latest.revised_capture_status,
    browser_native: revisedEvidence.browser_native,
    source: revisedEvidence.source,
    non_selected_browser_evidence_unchanged: postA.browser_evidence_id === preABrowserEvidenceId && postC.browser_evidence_id === preCBrowserEvidenceId,
    surface_includes_revised_browser_qa: Array.isArray(surface.revised_browser_qa_evidence) && surface.revised_browser_qa_evidence.length > 0,
    state_file: adapter.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});