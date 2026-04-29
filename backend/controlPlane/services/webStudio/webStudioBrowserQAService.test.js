const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('../../storage/fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('./webStudioDemoPackagingService');
const { createWebStudioBrowserQAService } = require('./webStudioBrowserQAService');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-browser-qa-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;
  const demoService = createWebStudioDemoPackagingService({ repositories });
  const browserQAService = createWebStudioBrowserQAService({ repositories });

  const demo = await demoService.materializeDemoOrderWithThreeVariants({ source: 'browser-qa-test' });
  const orderId = demo.order_id;
  const variants = demo.surface.variants;

  const evidenceRows = await browserQAService.createBrowserQAEvidenceForOrderVariants(orderId);
  assert.strictEqual(evidenceRows.length, 3);
  assert.strictEqual(new Set(evidenceRows.map((row) => row.browser_evidence_id)).size, 3);
  assert(evidenceRows.every((row) => row.browser_native === false));
  assert(evidenceRows.every((row) => row.source === 'bounded_local_browser_qa_evidence'));
  assert(evidenceRows.every((row) => Array.isArray(row.checks) && row.checks.length >= 7));
  assert(evidenceRows[0].governed_flow_id, 'must preserve governed_flow_id');
  assert(evidenceRows[0].taskflow_id, 'must preserve taskflow_id');
  assert(evidenceRows[0].child_session_id, 'must preserve child_session_id');

  const secondPass = await browserQAService.createBrowserQAEvidenceForOrderVariants(orderId);
  assert.deepStrictEqual(secondPass.map((row) => row.browser_evidence_id), evidenceRows.map((row) => row.browser_evidence_id));

  const qaRows = demo.surface.qa_results;
  const refreshedQaRows = await Promise.all(qaRows.map((row) => repositories.webStudioQAResults.getQAResultById({ qa_result_id: row.qa_result_id })));
  assert(refreshedQaRows.every((row) => row.browser_evidence_id), 'qa results must be linked to browser evidence');

  let rejectedUnknownVariant = false;
  try {
    await browserQAService.createBrowserQAEvidenceForVariant(orderId, 'missing-variant');
  } catch {
    rejectedUnknownVariant = true;
  }
  assert(rejectedUnknownVariant, 'must reject unknown variant');

  const foreign = await demoService.materializeDemoOrderWithThreeVariants({ source: 'browser-qa-test-2' });
  let rejectedForeignVariant = false;
  try {
    await browserQAService.createBrowserQAEvidenceForVariant(orderId, foreign.surface.variants[0].variant_id);
  } catch {
    rejectedForeignVariant = true;
  }
  assert(rejectedForeignVariant, 'must reject foreign variant');

  console.log('webStudioBrowserQAService test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
