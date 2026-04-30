const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../backend/controlPlane/storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../backend/controlPlane/services/webStudio/webStudioDemoPackagingService');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoPackagingService = createWebStudioDemoPackagingService({ repositories });

  const demo = await demoPackagingService.materializeDemoOrderWithThreeVariants({ order_id: 'ws-order-demo-0001' });
  await demoPackagingService.createDemoRevisionLane(demo.order_id, demo.surface.variants.find((row) => row.branch_name === 'B').variant_id, {
    requested_changes: ['Tighten hero copy'],
  });
  await demoPackagingService.executeDemoRevision(demo.order_id);
  await demoPackagingService.runDemoRevisionBrowserQA(demo.order_id);
  await demoPackagingService.buildDemoPublicDelivery(demo.order_id);
  const execution = await demoPackagingService.createDemoExecutionRuns(demo.order_id);

  const surface = execution.surface;
  const runs = surface.execution_runs || [];
  if (!runs.length) throw new Error('Expected at least one execution run');
  for (const run of runs) {
    if (!run.execution_run_id) throw new Error('execution_run_id missing');
    if (!run.child_session_id) throw new Error('child_session_id missing');
    if (!run.variant_id) throw new Error('variant_id missing');
    if (run.openclaw_native === true && !run.external_execution_id) {
      throw new Error('external_execution_id required for native execution');
    }
    if (run.openclaw_native === false && run.source !== 'bounded_local_execution_adapter') {
      throw new Error('bounded execution source must be honest');
    }
  }

  const byBranch = Object.fromEntries(runs.map((run) => [run.branch_name, run]));

  console.log(JSON.stringify({
    ok: true,
    order_id: demo.order_id,
    execution_runs_count: runs.length,
    execution_run_A_id: byBranch.A?.execution_run_id || null,
    execution_run_B_id: byBranch.B?.execution_run_id || null,
    execution_run_C_id: byBranch.C?.execution_run_id || null,
    selected_execution_run_id: runs.find((run) => run.scope === 'selected_variant')?.execution_run_id || null,
    source: runs[0].source,
    provider: runs[0].provider,
    openclaw_native: runs[0].openclaw_native,
    external_execution_id: runs[0].external_execution_id,
    surface_includes_execution_runs: Array.isArray(surface.execution_runs),
    state_file: path.join(rootDir, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'state.json'),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});