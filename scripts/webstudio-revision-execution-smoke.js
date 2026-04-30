const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioRevisionExecutionService } = require('../backend/controlPlane/services/webStudio/webStudioRevisionExecutionService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;

  const demoService = createWebStudioDemoPackagingService({ repositories });
  const revisionExecutionService = createWebStudioRevisionExecutionService({ repositories, rootDir });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_revision_execution' });
  const variantA = demo.surface.variants.find((row) => row.branch_name === 'A');
  const variantB = demo.surface.variants.find((row) => row.branch_name === 'B');
  const variantC = demo.surface.variants.find((row) => row.branch_name === 'C');

  const preAArtifactId = variantA.build_artifact_id;
  const preAHtmlPath = variantA.html_path;
  const preCArtifactId = variantC.build_artifact_id;
  const preCHtmlPath = variantC.html_path;

  const lane = await demoService.createDemoRevisionLane(
    demo.order_id,
    variantB.variant_id,
    'Усилить первый экран, добавить больше доверия, сделать CTA заметнее, не менять базовую структуру.',
  );

  const execution = await revisionExecutionService.executeLatestRevisionForOrder(demo.order_id);
  const surface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });
  const latest = surface.latest_revision_request;
  const revised = execution.revised_build_artifact;
  const postA = surface.variants.find((row) => row.branch_name === 'A');
  const postB = surface.variants.find((row) => row.branch_name === 'B');
  const postC = surface.variants.find((row) => row.branch_name === 'C');

  assert.strictEqual(latest.status, 'completed');
  assert.strictEqual(latest.revision_execution_status, 'completed');
  assert(latest.revised_build_artifact_id);
  assert(revised.html_path);
  assert(revised.manifest_path);
  assert(fs.existsSync(revised.html_path));
  assert(fs.existsSync(revised.manifest_path));

  const manifest = JSON.parse(fs.readFileSync(revised.manifest_path, 'utf8'));
  assert.strictEqual(manifest.parent_build_artifact_id, variantB.build_artifact_id);
  assert.strictEqual(manifest.selected_variant_id, variantB.variant_id);
  assert.strictEqual(postB.revised_build_artifact_id, revised.build_artifact_id);
  assert.strictEqual(postA.build_artifact_id, preAArtifactId);
  assert.strictEqual(postA.html_path, preAHtmlPath);
  assert.strictEqual(postC.build_artifact_id, preCArtifactId);
  assert.strictEqual(postC.html_path, preCHtmlPath);
  assert(Array.isArray(surface.revised_build_artifacts));
  assert(surface.revised_build_artifacts.some((row) => row.build_artifact_id === revised.build_artifact_id));
  assert(surface.revision_lane.completed || surface.revision_lane.status === 'completed');

  console.log(JSON.stringify({
    ok: true,
    order_id: surface.order.order_id,
    governed_flow_id: surface.taskflow_binding?.governed_flow_id || null,
    taskflow_id: surface.taskflow_binding?.taskflow_id || null,
    binding_id: surface.taskflow_binding?.binding_id || null,
    selected_variant_id: surface.selected_variant_id,
    revision_request_id: lane.revision_request_id,
    revision_number: latest.revision_number,
    parent_build_artifact_id: latest.parent_build_artifact_id,
    revised_build_artifact_id: latest.revised_build_artifact_id,
    revised_html_path: revised.html_path,
    revised_manifest_path: revised.manifest_path,
    revised_html_exists: fs.existsSync(revised.html_path),
    revised_manifest_exists: fs.existsSync(revised.manifest_path),
    revision_execution_status: latest.revision_execution_status,
    revision_lane_status: surface.revision_lane.status,
    non_selected_variants_unchanged: postA.build_artifact_id === preAArtifactId && postA.html_path === preAHtmlPath && postC.build_artifact_id === preCArtifactId && postC.html_path === preCHtmlPath,
    surface_includes_revised_artifacts: Array.isArray(surface.revised_build_artifacts) && surface.revised_build_artifacts.length > 0,
    revision_native: latest.revision_native,
    source: latest.execution_source,
    state_file: adapter.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});