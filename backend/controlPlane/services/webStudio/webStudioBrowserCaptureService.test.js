const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioBrowserCaptureService } = require('./webStudioBrowserCaptureService');

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-browser-capture-'));
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();

  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const captureService = createWebStudioBrowserCaptureService({ repositories, rootDir });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'test_webstudio_browser_capture' });
  const capability = await captureService.detectBrowserCaptureCapability();
  assert.strictEqual(capability.available, false);
  assert(capability.reason);

  const captured = await captureService.captureBrowserEvidenceForOrderVariants(demo.order_id);
  assert.strictEqual(captured.length, 3);

  const capturedAgain = await captureService.captureBrowserEvidenceForOrderVariants(demo.order_id);
  assert.strictEqual(capturedAgain.length, 3);
  assert.deepStrictEqual(captured.map((row) => row.browser_evidence_id), capturedAgain.map((row) => row.browser_evidence_id));

  for (const row of captured) {
    assert(row.build_artifact_id);
    assert(row.preview_path);
    assert(row.html_path);
    assert.strictEqual(row.browser_native, false);
    assert.strictEqual(row.source, 'bounded_preview_target_browser_evidence');
    assert.strictEqual(row.capture_status, 'not_available');
    assert(await exists(row.html_path));
    assert(await exists(row.snapshot_path));
    assert.strictEqual(row.screenshot_path, null);
    assert.strictEqual(row.governed_flow_id, demo.governed_flow_id);
    assert.strictEqual(row.taskflow_id, demo.taskflow_id);
    assert(row.child_session_id);
    assert(row.checks.some((check) => check.check_id === 'preview_target_exists' && check.status === 'passed'));
    assert(row.checks.some((check) => check.check_id === 'build_manifest_exists' && check.status === 'passed'));
    assert(row.checks.some((check) => check.check_id === 'browser_capture_available' && check.status === 'needs_review'));
    assert(row.checks.some((check) => check.check_id === 'screenshot_captured' && check.status === 'needs_review'));
    assert(row.checks.some((check) => check.check_id === 'primary_cta_presence' && check.status === 'passed'));
    assert(row.checks.some((check) => check.check_id === 'trust_block_presence' && check.status === 'passed'));
  }

  const unknownOrderPromise = captureService.captureBrowserEvidenceForVariant('missing-order', captured[0].variant_id);
  await assert.rejects(unknownOrderPromise, /WebStudio order not found/);

  const wrongVariantPromise = captureService.captureBrowserEvidenceForVariant(demo.order_id, 'missing-variant');
  await assert.rejects(wrongVariantPromise, /WebStudio variant not found/);

  const otherDemo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'test_webstudio_browser_capture_2' });
  const foreignVariantId = otherDemo.surface.variants[0].variant_id;
  const foreignVariantPromise = captureService.captureBrowserEvidenceForVariant(demo.order_id, foreignVariantId);
  await assert.rejects(foreignVariantPromise, /Variant does not belong to order/);

  const firstVariant = demo.surface.variants[0];
  const buildArtifact = await repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: firstVariant.variant_id });
  await repositories.webStudioBuildArtifacts.updateBuildArtifactById({
    build_artifact_id: buildArtifact.build_artifact_id,
    patch: {
      html_path: path.join(rootDir, 'missing.html'),
      preview_path: path.join(rootDir, 'missing.html'),
      updated_at: new Date().toISOString(),
    },
  });
  await assert.rejects(
    captureService.captureBrowserEvidenceForVariant(demo.order_id, firstVariant.variant_id),
    /Build artifact HTML path missing/,
  );

  console.log('webStudioBrowserCaptureService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
