const path = require('path');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');
const { createWebStudioTaskFlowBindingService } = require('../backend/controlPlane/services/webStudio/webStudioTaskFlowBindingService');
const { createWebStudioOrderSurfaceService } = require('../backend/controlPlane/services/webStudio/webStudioOrderSurfaceService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const bindingService = createWebStudioTaskFlowBindingService({ repositories });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });
  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'smoke_webstudio_taskflow_binding' });
  const initialSurface = demo.surface;
  const variants = initialSurface.variants || [];
  const variantB = variants.find((row) => row.branch_name === 'B');

  assert(initialSurface.taskflow_binding, 'taskflow binding must exist after walkthrough');
  assert(initialSurface.taskflow_binding.governed_flow_id, 'governed_flow_id must exist');
  assert(initialSurface.taskflow_binding.taskflow_id, 'taskflow_id must exist');
  assert.strictEqual(initialSurface.taskflow_binding.waiting_state.is_waiting, true);
  assert(variantB, 'variant B must exist');

  await bindingService.resumeOrderWithClientChoice(demo.order_id, variantB.variant_id, {
    actor: { actor_type: 'operator', actor_id: 'smoke-select-b' },
  });

  const finalSurface = await surfaceService.buildOrderSurface({ order_id: demo.order_id });
  assert(finalSurface.taskflow_binding, 'taskflow binding must still exist');
  assert.strictEqual(finalSurface.taskflow_binding.selected_variant_id, variantB.variant_id);
  assert.strictEqual(finalSurface.taskflow_binding.waiting_state.is_waiting, false);
  assert((finalSurface.taskflow_binding.resume_history || []).length >= 1);

  console.log(JSON.stringify({
    ok: true,
    order_id: finalSurface.order.order_id,
    governed_flow_id: finalSurface.taskflow_binding.governed_flow_id,
    taskflow_id: finalSurface.taskflow_binding.taskflow_id,
    binding_id: finalSurface.taskflow_binding.binding_id,
    variant_A_id: variants.find((row) => row.branch_name === 'A')?.variant_id || null,
    variant_B_id: variantB.variant_id,
    variant_C_id: variants.find((row) => row.branch_name === 'C')?.variant_id || null,
    selected_variant_id: finalSurface.taskflow_binding.selected_variant_id,
    delivery_id: finalSurface.delivery_bundle?.delivery_id || null,
    waiting_before_resume: initialSurface.taskflow_binding.waiting_state.is_waiting,
    waiting_after_resume: finalSurface.taskflow_binding.waiting_state.is_waiting,
    resume_history_count: (finalSurface.taskflow_binding.resume_history || []).length,
    state_file: adapter.stateFile,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
