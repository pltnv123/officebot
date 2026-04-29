const path = require('path');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const service = createWebStudioDemoPackagingService({ repositories });
  const demo = await service.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_order_surface' });
  const surface = demo.surface;

  assert(surface, 'surface must exist');
  assert(surface.order, 'order must exist');
  assert(Array.isArray(surface.variants), 'variants must exist');
  assert.strictEqual(surface.variants.length, 3, 'must create exactly 3 variants');
  assert.deepStrictEqual(surface.variants.map((row) => row.branch_name), ['A', 'B', 'C']);
  assert(surface.qa_results.length === 3, 'must have QA result per variant');
  assert(surface.delivery_bundle, 'delivery bundle must exist');
  assert.strictEqual(surface.source, 'real_persisted_records');

  const variants = surface.variants;

  console.log(JSON.stringify({
    ok: true,
    order_id: surface.order.order_id,
    governed_flow_id: surface.governed_flow_id || null,
    taskflow_id: surface.taskflow_binding?.taskflow_id || surface.taskflow_id || null,
    binding_id: surface.taskflow_binding?.binding_id || null,
    variant_A_id: variants[0]?.variant_id || null,
    variant_B_id: variants[1]?.variant_id || null,
    variant_C_id: variants[2]?.variant_id || null,
    child_task_A_id: variants[0]?.child_task_id || null,
    child_task_B_id: variants[1]?.child_task_id || null,
    child_task_C_id: variants[2]?.child_task_id || null,
    qa_A_id: variants[0]?.qa_result?.qa_result_id || null,
    qa_B_id: variants[1]?.qa_result?.qa_result_id || null,
    qa_C_id: variants[2]?.qa_result?.qa_result_id || null,
    delivery_id: surface.delivery_bundle?.delivery_id || null,
    state_file: adapter.stateFile,
    limitations: [
      'QA evidence is placeholder/mock in WEBSTUDIO-001.',
      'No real OpenClaw child sessions were spawned in this slice.',
      'TaskFlow identity is bounded local persisted identity, not a proven OpenClaw-native TaskFlow entity yet.',
      'No real site generation/browser verification is implemented yet.',
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
