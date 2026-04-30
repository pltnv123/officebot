const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-execution-adapter-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const storageDir = path.join(rootDir, 'backend', 'controlPlane', 'storage');
  await fs.writeFile(path.join(storageDir, '.first-governed-workflow-runtime', 'state.json'), JSON.stringify({
    orders: {},
    webstudio_orders: {},
    webstudio_variants: {},
  }, null, 2), 'utf8').catch(async () => {
    await fs.mkdir(path.join(storageDir, '.first-governed-workflow-runtime'), { recursive: true });
    await fs.writeFile(path.join(storageDir, '.first-governed-workflow-runtime', 'state.json'), JSON.stringify({
      orders: {},
      webstudio_orders: {},
      webstudio_variants: {},
    }, null, 2), 'utf8');
  });

  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  const repositories = adapter.repositories;

  const emptyState = await adapter.exportState();
  assert(emptyState.webstudio_execution_runs, 'execution run bucket must hydrate on old state');

  const stored = await repositories.webStudioExecutionRuns.createExecutionRun({
    execution_run: {
      execution_run_id: 'ws-execution-run-ws-order-test-1-a-initial',
      order_id: 'ws-order-test-1',
      variant_id: 'ws-variant-test-a',
      branch_name: 'A',
      child_session_id: 'ws-child-session-test-a',
      child_agent_id: 'ws-agent-webstudio-variant-a',
      child_workspace_key: 'ws-workspace-ws-order-test-1-a',
      governed_flow_id: 'ws-governed-flow-ws-order-test-1',
      taskflow_id: 'ws-taskflow-ws-order-test-1',
      binding_id: 'ws-taskflow-binding-ws-order-test-1',
      revision_request_id: null,
      revision_number: null,
      scope: 'initial_variant',
      source: 'bounded_local_execution_adapter',
      provider: 'bounded_local',
      openclaw_native: false,
      status: 'completed',
      execution_spec: { variant_id: 'ws-variant-test-a' },
      execution_output: { execution_summary: 'ok' },
      external_execution_id: null,
      related_build_artifact_id: 'ws-build-artifact-ws-order-test-1-a',
      started_at: '2026-04-30T00:00:00.000Z',
      completed_at: '2026-04-30T00:00:01.000Z',
      created_at: '2026-04-30T00:00:00.000Z',
      updated_at: '2026-04-30T00:00:01.000Z',
      limitations: ['bounded'],
      metadata: { provider: 'bounded_local' },
    },
  });

  assert.strictEqual(stored.execution_run_id, 'ws-execution-run-ws-order-test-1-a-initial');
  const fetched = await repositories.webStudioExecutionRuns.getExecutionRunById({ execution_run_id: stored.execution_run_id });
  assert.strictEqual(fetched.source, 'bounded_local_execution_adapter');

  const updated = await repositories.webStudioExecutionRuns.updateExecutionRunById({
    execution_run_id: stored.execution_run_id,
    patch: {
      status: 'linked',
      updated_at: '2026-04-30T00:00:02.000Z',
    },
  });
  assert.strictEqual(updated.status, 'linked');

  const listed = await repositories.webStudioExecutionRuns.listExecutionRunsByOrderId({ order_id: 'ws-order-test-1' });
  assert.strictEqual(listed.length, 1);

  const state = await adapter.exportState();
  assert(state.webstudio_execution_runs[stored.execution_run_id], 'persisted state must include execution run');
  assert.strictEqual(state.webstudio_execution_runs[stored.execution_run_id].provider, 'bounded_local');

  console.log('fileBackedFirstGovernedWorkflowRepositoryAdapter webstudio execution runs test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});