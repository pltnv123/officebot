const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioTaskFlowBindingService } = require('./webStudioTaskFlowBindingService');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-taskflow-binding-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const bindingService = createWebStudioTaskFlowBindingService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'binding-test' });
  const orderId = demo.order_id;
  const variants = demo.surface.variants;
  const deliveryId = demo.surface.delivery_bundle.delivery_id;

  const bound = await bindingService.bindOrderToGovernedFlow(orderId);
  assert(bound.governed_flow_id, 'governed_flow_id must exist');
  assert(bound.taskflow_id, 'taskflow_id must exist');

  const rebound = await bindingService.bindOrderToGovernedFlow(orderId);
  assert.strictEqual(rebound.binding_id, bound.binding_id, 'binding must be idempotent');

  let rejected = false;
  try {
    await bindingService.resumeOrderWithClientChoice(orderId, 'fake-variant');
  } catch {
    rejected = true;
  }
  assert(rejected, 'invalid variant resume must be rejected');

  await bindingService.setOrderWaitingForClientChoice(orderId, deliveryId);
  const waitingBinding = await bindingService.getTaskFlowBindingSurface(orderId);
  assert.strictEqual(waitingBinding.waiting_state.is_waiting, true);
  assert.strictEqual(waitingBinding.status, 'waiting_for_client_choice');

  const resumed = await bindingService.resumeOrderWithClientChoice(orderId, variants[1].variant_id, {
    actor: { actor_type: 'operator', actor_id: 'demo-select-b' },
  });
  assert.strictEqual(resumed.selected_variant_id, variants[1].variant_id);
  assert.strictEqual(resumed.waiting_state.is_waiting, false);
  assert((resumed.resume_history || []).length >= 1, 'resume history must be updated');

  console.log('webStudioTaskFlowBindingService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
