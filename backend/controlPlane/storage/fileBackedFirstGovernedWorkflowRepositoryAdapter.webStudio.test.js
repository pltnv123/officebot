const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-adapter-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;

  await repositories.webStudioOrders.createOrder({
    order: {
      order_id: 'ws-order-test-1',
      status: 'intake_received',
      raw_brief: { foo: 'bar' },
      normalized_brief: null,
      created_at: '2026-04-29T00:00:00.000Z',
      updated_at: '2026-04-29T00:00:00.000Z',
    },
  });

  const fetched = await repositories.webStudioOrders.getOrderById({ order_id: 'ws-order-test-1' });
  assert(fetched, 'webstudio order must be persisted');

  const state = await adapter.exportState();
  assert(state.webstudio_orders, 'webstudio_orders bucket must exist');
  assert(state.webstudio_variants, 'webstudio_variants bucket must exist');
  assert(state.webstudio_qa_results, 'webstudio_qa_results bucket must exist');
  assert(state.webstudio_delivery_bundles, 'webstudio_delivery_bundles bucket must exist');

  console.log('fileBackedFirstGovernedWorkflowRepositoryAdapter webstudio test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
