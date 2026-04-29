const assert = require('assert');
const path = require('path');
const { runFirstGovernedWorkflowWalkthrough } = require('./runFirstGovernedWorkflowWalkthrough');

(async () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const result = await runFirstGovernedWorkflowWalkthrough({ rootDir, reset: true });

  assert.equal(result.ids.parentTaskId, 'governed-parent-task-1');
  assert.equal(result.ids.childTaskId, 'governed-child-task-1');
  assert.equal(result.ids.spawnRequestId, 'governed-spawn-request-1');
  assert.equal(result.ids.approvalRequestId, 'governed-spawn-request-1:approval');
  assert.equal(result.workflowSurface.workflow_status, 'merged_back');
  assert.equal(result.workflowSurface.ids.governed_flow_id, 'governed:governed-parent-task-1:governed-parent-task-1:governed-spawn-request-1:governed-child-task-1');
  assert.equal(result.proof.proof_summary.merged_child_result_present, true);
  assert.equal(result.proof.proof_summary.child_completed, true);
  assert.equal(result.proof.proof_summary.deny_branch_terminal, true);

  console.log('runFirstGovernedWorkflowWalkthrough test passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
