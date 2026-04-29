const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../services/webStudio/webStudioDemoPackagingService');

async function runWebStudioOrderWalkthrough({ rootDir, reset = false, rawBrief = null } = {}) {
  if (!rootDir) {
    throw new Error('runWebStudioOrderWalkthrough requires rootDir');
  }

  const adapter = createFileBackedFirstGovernedWorkflowRepositoryAdapter({ rootDir });
  if (reset) {
    await adapter.clearRuntimeState();
  }

  const repositories = adapter.repositories;
  const webStudioDemoPackagingService = createWebStudioDemoPackagingService({ repositories });
  const demo = await webStudioDemoPackagingService.materializeDemoOrderWithThreeVariants({
    raw_brief: rawBrief,
    source: 'scripted_webstudio_walkthrough',
  });

  return {
    repositories,
    stateFile: adapter.stateFile,
    demo,
  };
}

module.exports = {
  runWebStudioOrderWalkthrough,
};
