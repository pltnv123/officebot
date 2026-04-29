const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-taskflow-adapter-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;

  const binding = await repositories.webStudioTaskFlowBindings.createBinding({
    binding: {
      binding_id: 'ws-taskflow-binding-test-1',
      order_id: 'ws-order-test-1',
      governed_flow_id: 'ws-governed-flow-ws-order-test-1',
      taskflow_id: 'ws-taskflow-ws-order-test-1',
      source: 'bounded_local_taskflow_identity',
      openclaw_native: false,
      status: 'bound',
      waiting_state: { is_waiting: false, waiting_reason: null, allowed_resume_actions: [], resumed_at: null },
      selected_variant_id: null,
      resume_history: [],
      created_at: '2026-04-29T00:00:00.000Z',
      updated_at: '2026-04-29T00:00:00.000Z',
    },
  });

  assert(binding.binding_id, 'binding must be stored');
  const fetched = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: 'ws-order-test-1' });
  assert(fetched, 'binding must be loadable by order');
  assert.strictEqual(fetched.taskflow_id, 'ws-taskflow-ws-order-test-1');

  const updated = await repositories.webStudioTaskFlowBindings.updateBindingById({
    binding_id: binding.binding_id,
    patch: {
      selected_variant_id: 'variant-b',
      updated_at: '2026-04-29T01:00:00.000Z',
    },
  });
  assert.strictEqual(updated.selected_variant_id, 'variant-b');

  const state = await adapter.exportState();
  assert(state.webstudio_taskflow_bindings, 'binding bucket must exist');

  console.log('fileBackedFirstGovernedWorkflowRepositoryAdapter webstudio taskflow test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
