const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const assert = require('assert');
const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');

async function main() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'webstudio-revision-adapter-'));
  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir: dir });
  await adapter.clearRuntimeState();

  const state = await adapter.exportState();
  assert(state.webstudio_revision_requests, 'revision request bucket must exist');

  const revision = {
    revision_request_id: 'ws-revision-order-b-0001',
    order_id: 'order-1',
    selected_variant_id: 'variant-b',
    branch_name: 'B',
    revision_number: 1,
    status: 'requested',
    revision_lane_status: 'ready',
    delta_brief: { requested_changes: ['make CTA stronger'] },
    created_at: '2026-04-29T00:00:00.000Z',
    updated_at: '2026-04-29T00:00:00.000Z',
  };

  const created = await adapter.repositories.webStudioRevisionRequests.createRevisionRequest({ revision_request: revision });
  assert.strictEqual(created.revision_request_id, revision.revision_request_id);

  const fetched = await adapter.repositories.webStudioRevisionRequests.getRevisionRequestById({ revision_request_id: revision.revision_request_id });
  assert.strictEqual(fetched.selected_variant_id, 'variant-b');

  const listed = await adapter.repositories.webStudioRevisionRequests.listRevisionRequestsByOrderId({ order_id: 'order-1' });
  assert.strictEqual(listed.length, 1);

  const updated = await adapter.repositories.webStudioRevisionRequests.updateRevisionRequestById({
    revision_request_id: revision.revision_request_id,
    patch: {
      status: 'revision_ready',
      revision_lane_status: 'pending_execution',
    },
  });
  assert.strictEqual(updated.status, 'revision_ready');
  assert.strictEqual(updated.revision_lane_status, 'pending_execution');

  console.log('fileBackedFirstGovernedWorkflowRepositoryAdapter.webStudioRevision test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
