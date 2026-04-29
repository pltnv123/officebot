const { createFileBackedFirstGovernedWorkflowRepositoryAdapter } = require('./fileBackedFirstGovernedWorkflowRepositoryAdapter');
const { createWebStudioDemoPackagingService } = require('../services/webStudio/webStudioDemoPackagingService');
const { createWebStudioTaskFlowBindingService } = require('../services/webStudio/webStudioTaskFlowBindingService');
const { createWebStudioOrderSurfaceService } = require('../services/webStudio/webStudioOrderSurfaceService');

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
  const webStudioTaskFlowBindingService = createWebStudioTaskFlowBindingService({ repositories });
  const webStudioOrderSurfaceService = createWebStudioOrderSurfaceService({ repositories });
  const demo = await webStudioDemoPackagingService.materializeDemoOrderWithThreeVariants({
    raw_brief: rawBrief,
    source: 'scripted_webstudio_walkthrough',
  });

  async function resumeWithClientChoice(selectedVariantId, options = {}) {
    const binding = await webStudioTaskFlowBindingService.resumeOrderWithClientChoice(demo.order_id, selectedVariantId, options);
    const surface = await webStudioOrderSurfaceService.buildOrderSurface({ order_id: demo.order_id });
    return { binding, surface };
  }

  return {
    repositories,
    stateFile: adapter.stateFile,
    demo,
    resumeWithClientChoice,
  };
}

module.exports = {
  runWebStudioOrderWalkthrough,
};
