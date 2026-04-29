const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');

async function mkTempRoot() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-browser-qa-adapter-'));
  await fs.mkdir(path.join(dir, 'backend', 'controlPlane', 'storage'), { recursive: true });
  return dir;
}

async function main() {
  const rootDir = await mkTempRoot();
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  await adapter.clearRuntimeState();
  const repositories = adapter.repositories;

  const stored = await repositories.webStudioBrowserQAEvidence.createBrowserEvidence({
    browser_evidence: {
      browser_evidence_id: 'ws-browser-evidence-test-a',
      order_id: 'ws-order-test-1',
      variant_id: 'ws-variant-test-a',
      branch_name: 'A',
      qa_result_id: 'ws-qa-test-a',
      child_session_id: 'ws-child-session-test-a',
      child_agent_id: 'ws-agent-webstudio-variant-a',
      child_workspace_key: 'ws-workspace-ws-order-test-1-a',
      governed_flow_id: 'ws-governed-flow-ws-order-test-1',
      taskflow_id: 'ws-taskflow-ws-order-test-1',
      binding_id: 'ws-taskflow-binding-ws-order-test-1',
      source: 'bounded_local_browser_qa_evidence',
      browser_native: false,
      status: 'needs_review',
      checks: [{ check_id: 'page_load', status: 'needs_review' }],
      screenshot_path: null,
      snapshot_path: null,
      trace_path: null,
      evidence_artifacts: [{ type: 'structured_placeholder', native: false }],
      risks: ['placeholder evidence'],
      created_at: '2026-04-29T00:00:00.000Z',
      updated_at: '2026-04-29T00:00:00.000Z',
    },
  });

  assert(stored.browser_evidence_id, 'browser evidence must be stored');
  const fetched = await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceByVariantId({ variant_id: 'ws-variant-test-a' });
  assert(fetched, 'must load evidence by variant');
  assert.strictEqual(fetched.source, 'bounded_local_browser_qa_evidence');

  const updated = await repositories.webStudioBrowserQAEvidence.updateBrowserEvidenceById({
    browser_evidence_id: stored.browser_evidence_id,
    patch: {
      status: 'passed',
      updated_at: '2026-04-29T01:00:00.000Z',
    },
  });
  assert.strictEqual(updated.status, 'passed');

  const state = await adapter.exportState();
  assert(state.webstudio_browser_qa_evidence, 'browser QA evidence bucket must exist');

  console.log('fileBackedFirstGovernedWorkflowRepositoryAdapter webstudio browser QA test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
