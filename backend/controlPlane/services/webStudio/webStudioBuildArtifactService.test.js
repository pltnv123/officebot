const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioBuildArtifactService } = require('./webStudioBuildArtifactService');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-build-artifact-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const buildService = createWebStudioBuildArtifactService({ repositories, rootDir });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'build-artifact-test' });
  const orderId = demo.order_id;

  const artifacts = await buildService.createBuildArtifactsForOrderVariants(orderId);
  assert.strictEqual(artifacts.length, 3);
  assert.strictEqual(new Set(artifacts.map((row) => row.build_artifact_id)).size, 3);
  assert(artifacts.every((row) => row.generator_native === false));
  assert(artifacts.every((row) => row.source === 'bounded_static_site_generator'));
  assert(await exists(artifacts[0].html_path));
  assert(await exists(artifacts[0].manifest_path));
  const manifest = JSON.parse(await fs.readFile(artifacts[0].manifest_path, 'utf8'));
  assert.strictEqual(manifest.build_artifact_id, artifacts[0].build_artifact_id);

  const secondPass = await buildService.createBuildArtifactsForOrderVariants(orderId);
  assert.deepStrictEqual(secondPass.map((row) => row.build_artifact_id), artifacts.map((row) => row.build_artifact_id));

  let rejectedUnknownVariant = false;
  try {
    await buildService.createBuildArtifactForVariant(orderId, 'missing-variant');
  } catch {
    rejectedUnknownVariant = true;
  }
  assert(rejectedUnknownVariant, 'must reject unknown variant');

  const foreign = await demoService.materializeDemoOrderWithThreeVariants({ source: 'build-artifact-test-2' });
  let rejectedForeignVariant = false;
  try {
    await buildService.createBuildArtifactForVariant(orderId, foreign.surface.variants[0].variant_id);
  } catch {
    rejectedForeignVariant = true;
  }
  assert(rejectedForeignVariant, 'must reject foreign variant');

  console.log('webStudioBuildArtifactService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
