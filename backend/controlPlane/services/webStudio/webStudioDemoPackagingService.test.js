const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-demo-packaging-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const service = createWebStudioDemoPackagingService({ repositories });

  const first = await service.materializeDemoOrderWithThreeVariants({ source: 'test-first' });
  const second = await service.materializeDemoOrderWithThreeVariants({ source: 'test-second' });

  assert.strictEqual(first.surface.variants.length, 3);
  assert.strictEqual(second.surface.variants.length, 3);
  assert.strictEqual(first.order_id, 'ws-order-demo-0001');
  assert.strictEqual(second.order_id, 'ws-order-demo-0002');
  assert.notStrictEqual(first.delivery_id, second.delivery_id);

  console.log('webStudioDemoPackagingService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
