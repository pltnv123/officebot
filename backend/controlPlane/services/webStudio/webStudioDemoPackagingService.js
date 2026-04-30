const { createWebStudioOrderService } = require('./webStudioOrderService');
const { createWebStudioVariantService } = require('./webStudioVariantService');
const { createWebStudioQAService } = require('./webStudioQAService');
const { createWebStudioDeliveryService } = require('./webStudioDeliveryService');
const { createWebStudioOrderSurfaceService } = require('./webStudioOrderSurfaceService');
const { createWebStudioTaskFlowBindingService } = require('./webStudioTaskFlowBindingService');
const { createWebStudioChildSessionService } = require('./webStudioChildSessionService');
const { createWebStudioBrowserQAService } = require('./webStudioBrowserQAService');
const { createWebStudioBuildArtifactService } = require('./webStudioBuildArtifactService');
const { createWebStudioBrowserCaptureService } = require('./webStudioBrowserCaptureService');
const { createWebStudioRevisionService } = require('./webStudioRevisionService');
const { createWebStudioRevisionExecutionService } = require('./webStudioRevisionExecutionService');
const { createWebStudioRevisionBrowserQAService } = require('./webStudioRevisionBrowserQAService');
const { createWebStudioPublicDeliveryService } = require('./webStudioPublicDeliveryService');
const { createWebStudioExecutionService } = require('./webStudioExecutionService');
const { createWebStudioPrimaryVariantService } = require('./webStudioPrimaryVariantService');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

async function createNextDeterministicDemoOrderId(repositories) {
  const orders = await repositories.webStudioOrders.listOrders({ sort: 'asc' });
  const maxSeq = orders.reduce((max, order) => {
    const match = String(order.order_id || '').match(/^ws-order-demo-(\d{4,})$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);
  return `ws-order-demo-${String(maxSeq + 1).padStart(4, '0')}`;
}

function buildDemoBrief() {
  return Object.freeze({
    project_type: 'landing_page',
    target_audience: 'small_business_owners',
    business_goal: 'generate_qualified_leads',
    required_sections: ['hero', 'services', 'social_proof', 'pricing', 'faq', 'cta'],
    style_direction: 'premium_modern',
    forbidden_patterns: ['fake_testimonials', 'dark_patterns'],
    deliverables: ['three_variant_concepts', 'qa_summary', 'delivery_bundle'],
    acceptance_criteria: [
      'three_distinct_variants_exist',
      'each_variant_has_child_task_linkage',
      'each_variant_has_qa_result',
      'delivery_bundle_is_ready',
    ],
    technical_constraints: {
      stack_hint: 'openclaw_native_webstudio_slice',
      deploy_target: 'deferred',
    },
    content_requirements: {
      language: 'ru',
      include_contact_cta: true,
    },
    seo_requirements: {
      title_focus: 'automation_web_studio',
      indexable: true,
    },
  });
}

function createWebStudioDemoPackagingService({ repositories } = {}) {
  if (!repositories) {
    throw new Error('webStudioDemoPackagingService requires repositories');
  }

  const orderService = createWebStudioOrderService({ repositories });
  const variantService = createWebStudioVariantService({ repositories });
  const qaService = createWebStudioQAService({ repositories });
  const deliveryService = createWebStudioDeliveryService({ repositories });
  const surfaceService = createWebStudioOrderSurfaceService({ repositories });
  const taskFlowBindingService = createWebStudioTaskFlowBindingService({ repositories });
  const childSessionService = createWebStudioChildSessionService({ repositories });
  const browserQAService = createWebStudioBrowserQAService({ repositories });
  const buildArtifactService = createWebStudioBuildArtifactService({ repositories, rootDir: repositories.__ROOT_DIR__ || process.cwd() });
  const browserCaptureService = createWebStudioBrowserCaptureService({ repositories, rootDir: repositories.__ROOT_DIR__ || process.cwd() });
  const revisionService = createWebStudioRevisionService({ repositories });
  const revisionExecutionService = createWebStudioRevisionExecutionService({ repositories, rootDir: repositories.__ROOT_DIR__ || process.cwd() });
  const revisionBrowserQAService = createWebStudioRevisionBrowserQAService({ repositories, rootDir: repositories.__ROOT_DIR__ || process.cwd() });
  const publicDeliveryService = createWebStudioPublicDeliveryService({ repositories, rootDir: repositories.__ROOT_DIR__ || process.cwd() });
  const executionService = createWebStudioExecutionService({ repositories });
  const primaryVariantService = createWebStudioPrimaryVariantService({ repositories });

  return Object.freeze({
    async createDemoWebStudioOrder(options = {}) {
      const rawBrief = clone(options.raw_brief || buildDemoBrief());
      const order = await orderService.createOrder(rawBrief, {
        order_id: options.order_id || await createNextDeterministicDemoOrderId(repositories),
        client_id: options.client_id || 'demo-client-1',
        source: options.source || 'demo_webstudio_smoke',
        governed_flow_id: options.governed_flow_id || null,
        taskflow_id: options.taskflow_id || null,
        metadata: {
          demo: true,
          slice: 'WEBSTUDIO-002',
          ...(options.metadata || {}),
        },
      });
      return orderService.normalizeBrief(order.order_id, { fallback_order: order });
    },

    async materializeDemoOrderWithThreeVariants(options = {}) {
      const normalizedOrder = await this.createDemoWebStudioOrder(options);
      let order = await orderService.getOrder(normalizedOrder.order_id);
      if (!order) {
        order = normalizedOrder;
      }
      const variants = await variantService.createThreeVariants(order, {
        parent_task_id: options.parent_task_id || null,
      });
      await primaryVariantService.applyPrimaryVariantPolicyToOrder(order.order_id);

      await orderService.markVariantsSpawned(order.order_id);

      const qaResults = [];
      for (const variant of variants) {
        await variantService.markVariantBuilding(variant.variant_id);
        await variantService.markVariantQAPending(variant.variant_id);
        const qaResult = await qaService.createQaResult(variant, order);
        const checks = (qaResult.checks || []).map((check) => {
          if (check.check_id === 'browser_verification') {
            return { ...check, status: 'placeholder' };
          }
          return { ...check, status: 'passed' };
        });
        const passedQa = await qaService.markQaPassed(
          variant.variant_id,
          checks,
          qaResult.browser_evidence,
          qaResult.risks,
          { fallback_qa_result: qaResult },
        );
        const effectiveQa = passedQa || qaResult;
        await variantService.markVariantQaPassed(variant.variant_id, effectiveQa.qa_result_id);
        await variantService.markVariantPackaged(variant.variant_id, [
          {
            artifact_kind: 'concept_summary',
            artifact_ref: `inline:${variant.variant_id}:concept`,
          },
          {
            artifact_kind: 'qa_summary',
            artifact_ref: `inline:${effectiveQa.qa_result_id}:qa`,
          },
        ]);
        qaResults.push(effectiveQa);
      }

      await orderService.markQaCompleted(order.order_id);
      const boundOrder = await taskFlowBindingService.bindOrderToGovernedFlow(order.order_id, { fallback_order: order });
      await orderService.markDeliveryReady(order.order_id, {
        governed_flow_id: boundOrder.governed_flow_id,
        taskflow_id: boundOrder.taskflow_id,
      });
      const latestVariants = await variantService.getVariantsForOrder(order.order_id);
      const refreshedOrder = await orderService.getOrder(order.order_id) || {
        ...order,
        governed_flow_id: boundOrder.governed_flow_id,
        taskflow_id: boundOrder.taskflow_id,
      };
      const delivery = await deliveryService.buildDeliveryBundle(refreshedOrder, latestVariants, qaResults, {
        metadata: {
          source: 'webstudio_demo_packaging_service',
          qa_mode: 'placeholder',
        },
      });
      await taskFlowBindingService.setOrderWaitingForClientChoice(order.order_id, delivery.delivery_id, { fallback_order: refreshedOrder });
      await childSessionService.createChildSessionsForOrderVariants(order.order_id);
      await browserQAService.createBrowserQAEvidenceForOrderVariants(order.order_id);
      await buildArtifactService.createBuildArtifactsForOrderVariants(order.order_id);
      await browserCaptureService.captureBrowserEvidenceForOrderVariants(order.order_id);

      const surface = await surfaceService.buildOrderSurface({ order_id: order.order_id });

      return Object.freeze({
        order_id: order.order_id,
        delivery_id: delivery.delivery_id,
        variant_ids: latestVariants.map((variant) => variant.variant_id),
        qa_result_ids: qaResults.map((row) => row.qa_result_id),
        child_task_ids: latestVariants.map((variant) => variant.child_task_id),
        surface,
        governed_flow_id: surface?.governed_flow_id || null,
        taskflow_id: surface?.taskflow_binding?.taskflow_id || surface?.taskflow_id || null,
        binding_id: surface?.taskflow_binding?.binding_id || null,
      });
    },

    async buildDemoDeliverySurface({ order_id }) {
      return surfaceService.buildOrderSurface({ order_id });
    },

    async createDemoRevisionLane(order_id, selected_variant_id, raw_delta_brief, options = {}) {
      await revisionService.selectVariantForOrder(order_id, selected_variant_id, options);
      const revisionRequest = await revisionService.createRevisionRequest(order_id, selected_variant_id, raw_delta_brief, options);
      const surface = await surfaceService.buildOrderSurface({ order_id });
      return Object.freeze({
        revision_request_id: revisionRequest.revision_request_id,
        selected_variant_id,
        revision_number: revisionRequest.revision_number,
        surface,
      });
    },

    async executeDemoRevision(order_id, options = {}) {
      const execution = await revisionExecutionService.executeLatestRevisionForOrder(order_id, options);
      const surface = await surfaceService.buildOrderSurface({ order_id });
      return Object.freeze({
        execution,
        surface,
      });
    },

    async runDemoRevisionBrowserQA(order_id, options = {}) {
      const execution = await revisionBrowserQAService.runBrowserQAForLatestRevision(order_id, options);
      const surface = await surfaceService.buildOrderSurface({ order_id });
      return Object.freeze({
        execution,
        surface,
      });
    },

    async buildDemoPublicDelivery(order_id, options = {}) {
      const bundle = await publicDeliveryService.buildPublicDeliveryBundleForOrder(order_id, options);
      const surface = await surfaceService.buildOrderSurface({ order_id });
      return Object.freeze({
        bundle,
        surface,
      });
    },

    async createDemoExecutionRuns(order_id, options = {}) {
      const execution_runs = await executionService.createExecutionRunsForOrderVariants(order_id, options);
      const surface = await surfaceService.buildOrderSurface({ order_id });
      return Object.freeze({
        execution_runs,
        surface,
      });
    },
  });
}

module.exports = {
  createWebStudioDemoPackagingService,
  buildDemoBrief,
};
