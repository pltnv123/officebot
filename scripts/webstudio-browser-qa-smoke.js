const path = require('path');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioBrowserQAService } = require('../backend/controlPlane/services/webStudio/webStudioBrowserQAService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const browserQAService = createWebStudioBrowserQAService({ repositories });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_browser_qa' });
  const evidenceRows = await browserQAService.createBrowserQAEvidenceForOrderVariants(demo.order_id);
  const surface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });

  assert(surface, 'surface must exist');
  assert.strictEqual(surface.variants.length, 3);
  assert.strictEqual(surface.child_sessions.length, 3);
  assert.strictEqual(surface.browser_qa_evidence.length, 3);
  assert.strictEqual(evidenceRows.length, 3);
  assert.strictEqual(new Set(evidenceRows.map((row) => row.browser_evidence_id)).size, 3);
  assert(surface.qa_results.every((row) => row.browser_evidence_id), 'qa results must be linked');
  assert(surface.variants.every((row) => row.browser_evidence_id), 'variants must expose browser evidence id');

  const variantA = surface.variants.find((row) => row.branch_name === 'A');
  const variantB = surface.variants.find((row) => row.branch_name === 'B');
  const variantC = surface.variants.find((row) => row.branch_name === 'C');
  const evidenceA = surface.browser_qa_evidence.find((row) => row.branch_name === 'A');
  const evidenceB = surface.browser_qa_evidence.find((row) => row.branch_name === 'B');
  const evidenceC = surface.browser_qa_evidence.find((row) => row.branch_name === 'C');

  console.log(JSON.stringify({
    ok: true,
    order_id: surface.order.order_id,
    governed_flow_id: surface.taskflow_binding?.governed_flow_id || null,
    taskflow_id: surface.taskflow_binding?.taskflow_id || null,
    binding_id: surface.taskflow_binding?.binding_id || null,
    variant_A_id: variantA?.variant_id || null,
    variant_B_id: variantB?.variant_id || null,
    variant_C_id: variantC?.variant_id || null,
    child_session_A_id: evidenceA?.child_session_id || null,
    child_session_B_id: evidenceB?.child_session_id || null,
    child_session_C_id: evidenceC?.child_session_id || null,
    browser_evidence_A_id: evidenceA?.browser_evidence_id || null,
    browser_evidence_B_id: evidenceB?.browser_evidence_id || null,
    browser_evidence_C_id: evidenceC?.browser_evidence_id || null,
    browser_qa_count: surface.browser_qa_evidence.length,
    unique_browser_evidence_ids: new Set(surface.browser_qa_evidence.map((row) => row.browser_evidence_id)).size === 3,
    qa_results_linked: surface.qa_results.every((row) => row.browser_evidence_id),
    surface_includes_browser_qa: Array.isArray(surface.browser_qa_evidence) && surface.browser_qa_evidence.length === 3,
    browser_native: evidenceA?.browser_native || false,
    source: evidenceA?.source || null,
    state_file: adapter.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
