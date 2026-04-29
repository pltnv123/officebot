const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-build-artifacts-adapter-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;

  const stored = await repositories.webStudioBuildArtifacts.createBuildArtifact({
    build_artifact: {
      build_artifact_id: 'ws-build-artifact-test-a',
      order_id: 'ws-order-test-1',
      variant_id: 'ws-variant-test-a',
      branch_name: 'A',
      child_session_id: 'ws-child-session-test-a',
      child_agent_id: 'ws-agent-webstudio-variant-a',
      child_workspace_key: 'ws-workspace-ws-order-test-1-a',
      governed_flow_id: 'ws-governed-flow-ws-order-test-1',
      taskflow_id: 'ws-taskflow-ws-order-test-1',
      binding_id: 'ws-taskflow-binding-ws-order-test-1',
      source: 'bounded_static_site_generator',
      generator_native: false,
      status: 'generated',
      artifact_root: '/tmp/root/a',
      html_path: '/tmp/root/a/index.html',
      css_path: '/tmp/root/a/styles.css',
      manifest_path: '/tmp/root/a/manifest.json',
      preview_path: '/tmp/root/a/index.html',
      preview_url: null,
      files: { html_path: '/tmp/root/a/index.html' },
      checks: { html_exists: true },
      limitations: ['bounded generator'],
      created_at: '2026-04-29T00:00:00.000Z',
      updated_at: '2026-04-29T00:00:00.000Z',
    },
  });

  assert(stored.build_artifact_id, 'build artifact must be stored');
  const fetched = await repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: 'ws-variant-test-a' });
  assert(fetched, 'must fetch build artifact by variant');
  assert.strictEqual(fetched.source, 'bounded_static_site_generator');

  const updated = await repositories.webStudioBuildArtifacts.updateBuildArtifactById({
    build_artifact_id: stored.build_artifact_id,
    patch: {
      status: 'packaged',
      updated_at: '2026-04-29T01:00:00.000Z',
    },
  });
  assert.strictEqual(updated.status, 'packaged');

  const state = await adapter.exportState();
  assert(state.webstudio_build_artifacts, 'build artifacts bucket must exist');

  console.log('fileBackedFirstGovernedWorkflowRepositoryAdapter webstudio build artifacts test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
