const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { runWebStudioOrderWalkthrough } = require('./runWebStudioOrderWalkthrough');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-walkthrough-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const result = await runWebStudioOrderWalkthrough({ rootDir, reset: true });

  assert(result.demo, 'demo result must exist');
  assert(result.demo.surface, 'surface must exist');
  assert.strictEqual(result.demo.surface.order.order_id, result.demo.order_id);
  assert.strictEqual(result.demo.surface.variants.length, 3);
  assert.deepStrictEqual(result.demo.surface.variants.map((row) => row.branch_name), ['A', 'B', 'C']);
  assert.strictEqual(result.demo.surface.qa_results.length, 3);
  assert(result.demo.surface.delivery_bundle, 'delivery bundle must exist');

  console.log('runWebStudioOrderWalkthrough test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
