const path = require('path');
const fs = require('fs/promises');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioBrowserCaptureService } = require('../backend/controlPlane/services/webStudio/webStudioBrowserCaptureService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const captureService = createWebStudioBrowserCaptureService({ repositories, rootDir });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_browser_capture' });
  const evidenceRows = await captureService.captureBrowserEvidenceForOrderVariants(demo.order_id);
  const surface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });

  assert(surface, 'surface must exist');
  assert.strictEqual(surface.variants.length, 3);
  assert.strictEqual(surface.build_artifacts.length, 3);
  assert.strictEqual(surface.browser_qa_evidence.length, 3);
  assert.strictEqual(evidenceRows.length, 3);

  const variantA = surface.variants.find((row) => row.branch_name === 'A');
  const variantB = surface.variants.find((row) => row.branch_name === 'B');
  const variantC = surface.variants.find((row) => row.branch_name === 'C');
  const buildA = surface.build_artifacts.find((row) => row.branch_name === 'A');
  const buildB = surface.build_artifacts.find((row) => row.branch_name === 'B');
  const buildC = surface.build_artifacts.find((row) => row.branch_name === 'C');
  const browserA = surface.browser_qa_evidence.find((row) => row.branch_name === 'A');
  const browserB = surface.browser_qa_evidence.find((row) => row.branch_name === 'B');
  const browserC = surface.browser_qa_evidence.find((row) => row.branch_name === 'C');

  for (const row of [browserA, browserB, browserC]) {
    assert(row.build_artifact_id);
    assert(row.preview_path);
    assert(row.html_path);
    assert(await exists(row.html_path));
    assert(row.checks.some((check) => check.check_id === 'preview_target_exists'));
    assert(row.checks.some((check) => check.check_id === 'browser_capture_available'));
    assert(row.checks.some((check) => check.check_id === 'screenshot_captured'));
    if (row.browser_native) {
      assert(row.screenshot_path);
      assert(await exists(row.screenshot_path));
    } else {
      assert.strictEqual(row.source, 'bounded_preview_target_browser_evidence');
      assert(Array.isArray(row.limitations) && row.limitations.length > 0);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    order_id: surface.order.order_id,
    governed_flow_id: surface.taskflow_binding?.governed_flow_id || null,
    taskflow_id: surface.taskflow_binding?.taskflow_id || null,
    binding_id: surface.taskflow_binding?.binding_id || null,
    variant_A_id: variantA?.variant_id || null,
    variant_B_id: variantB?.variant_id || null,
    variant_C_id: variantC?.variant_id || null,
    build_artifact_A_id: buildA?.build_artifact_id || null,
    build_artifact_B_id: buildB?.build_artifact_id || null,
    build_artifact_C_id: buildC?.build_artifact_id || null,
    browser_evidence_A_id: browserA?.browser_evidence_id || null,
    browser_evidence_B_id: browserB?.browser_evidence_id || null,
    browser_evidence_C_id: browserC?.browser_evidence_id || null,
    preview_A_path: browserA?.preview_path || null,
    preview_B_path: browserB?.preview_path || null,
    preview_C_path: browserC?.preview_path || null,
    html_A_exists: await exists(browserA?.html_path),
    html_B_exists: await exists(browserB?.html_path),
    html_C_exists: await exists(browserC?.html_path),
    capture_status_A: browserA?.capture_status || null,
    capture_status_B: browserB?.capture_status || null,
    capture_status_C: browserC?.capture_status || null,
    browser_native: Boolean(browserA?.browser_native || browserB?.browser_native || browserC?.browser_native),
    screenshot_A_path: browserA?.screenshot_path || null,
    screenshot_B_path: browserB?.screenshot_path || null,
    screenshot_C_path: browserC?.screenshot_path || null,
    screenshot_A_exists: browserA?.screenshot_path ? await exists(browserA.screenshot_path) : false,
    screenshot_B_exists: browserB?.screenshot_path ? await exists(browserB.screenshot_path) : false,
    screenshot_C_exists: browserC?.screenshot_path ? await exists(browserC.screenshot_path) : false,
    surface_includes_capture: Array.isArray(surface.browser_qa_evidence) && surface.browser_qa_evidence.every((row) => Object.prototype.hasOwnProperty.call(row, 'capture_status')),
    source: browserA?.source || null,
    state_file: adapter.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
