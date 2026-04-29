const path = require('path');
const fs = require('fs/promises');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioBuildArtifactService } = require('../backend/controlPlane/services/webStudio/webStudioBuildArtifactService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');

async function exists(p) {
  try {
    await fs.access(p);
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
  const buildService = createWebStudioBuildArtifactService({ repositories, rootDir });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_build_artifacts' });
  const artifacts = await buildService.createBuildArtifactsForOrderVariants(demo.order_id);
  const surface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });

  assert(surface, 'surface must exist');
  assert.strictEqual(surface.variants.length, 3);
  assert.strictEqual(surface.child_sessions.length, 3);
  assert.strictEqual(surface.browser_qa_evidence.length, 3);
  assert.strictEqual(surface.build_artifacts.length, 3);
  assert.strictEqual(artifacts.length, 3);

  const variantA = surface.variants.find((row) => row.branch_name === 'A');
  const variantB = surface.variants.find((row) => row.branch_name === 'B');
  const variantC = surface.variants.find((row) => row.branch_name === 'C');
  const buildA = surface.build_artifacts.find((row) => row.branch_name === 'A');
  const buildB = surface.build_artifacts.find((row) => row.branch_name === 'B');
  const buildC = surface.build_artifacts.find((row) => row.branch_name === 'C');
  const browserA = surface.browser_qa_evidence.find((row) => row.branch_name === 'A');
  const browserB = surface.browser_qa_evidence.find((row) => row.branch_name === 'B');
  const browserC = surface.browser_qa_evidence.find((row) => row.branch_name === 'C');

  assert(await exists(buildA.html_path));
  assert(await exists(buildB.html_path));
  assert(await exists(buildC.html_path));
  assert(await exists(buildA.manifest_path));
  assert(await exists(buildB.manifest_path));
  assert(await exists(buildC.manifest_path));
  JSON.parse(await fs.readFile(buildA.manifest_path, 'utf8'));
  JSON.parse(await fs.readFile(buildB.manifest_path, 'utf8'));
  JSON.parse(await fs.readFile(buildC.manifest_path, 'utf8'));

  console.log(JSON.stringify({
    ok: true,
    order_id: surface.order.order_id,
    governed_flow_id: surface.taskflow_binding?.governed_flow_id || null,
    taskflow_id: surface.taskflow_binding?.taskflow_id || null,
    binding_id: surface.taskflow_binding?.binding_id || null,
    variant_A_id: variantA?.variant_id || null,
    variant_B_id: variantB?.variant_id || null,
    variant_C_id: variantC?.variant_id || null,
    child_session_A_id: buildA?.child_session_id || null,
    child_session_B_id: buildB?.child_session_id || null,
    child_session_C_id: buildC?.child_session_id || null,
    browser_evidence_A_id: browserA?.browser_evidence_id || null,
    browser_evidence_B_id: browserB?.browser_evidence_id || null,
    browser_evidence_C_id: browserC?.browser_evidence_id || null,
    build_artifact_A_id: buildA?.build_artifact_id || null,
    build_artifact_B_id: buildB?.build_artifact_id || null,
    build_artifact_C_id: buildC?.build_artifact_id || null,
    html_A_path: buildA?.html_path || null,
    html_B_path: buildB?.html_path || null,
    html_C_path: buildC?.html_path || null,
    manifest_A_path: buildA?.manifest_path || null,
    manifest_B_path: buildB?.manifest_path || null,
    manifest_C_path: buildC?.manifest_path || null,
    html_A_exists: await exists(buildA?.html_path),
    html_B_exists: await exists(buildB?.html_path),
    html_C_exists: await exists(buildC?.html_path),
    manifest_A_exists: await exists(buildA?.manifest_path),
    manifest_B_exists: await exists(buildB?.manifest_path),
    manifest_C_exists: await exists(buildC?.manifest_path),
    build_artifacts_count: surface.build_artifacts.length,
    unique_build_artifact_ids: new Set(surface.build_artifacts.map((row) => row.build_artifact_id)).size === 3,
    surface_includes_build_artifacts: Array.isArray(surface.build_artifacts) && surface.build_artifacts.length === 3,
    generator_native: buildA?.generator_native || false,
    source: buildA?.source || null,
    state_file: adapter.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
