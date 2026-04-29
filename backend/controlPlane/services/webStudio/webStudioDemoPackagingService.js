const { createWebStudioOrderService } = require('./webStudioOrderService');
const { createWebStudioVariantService } = require('./webStudioVariantService');
const { createWebStudioQAService } = require('./webStudioQAService');
const { createWebStudioDeliveryService } = require('./webStudioDeliveryService');
const { createWebStudioOrderSurfaceService } = require('./webStudioOrderSurfaceService');

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
          slice: 'WEBSTUDIO-001',
          ...(options.metadata || {}),
        },
      });
      return orderService.normalizeBrief(order.order_id);
    },

    async materializeDemoOrderWithThreeVariants(options = {}) {
      const order = await this.createDemoWebStudioOrder(options);
      const variants = await variantService.createThreeVariants(order, {
        parent_task_id: options.parent_task_id || null,
      });

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
        );
        await variantService.markVariantQaPassed(variant.variant_id, passedQa.qa_result_id);
        await variantService.markVariantPackaged(variant.variant_id, [
          {
            artifact_kind: 'concept_summary',
            artifact_ref: `inline:${variant.variant_id}:concept`,
          },
          {
            artifact_kind: 'qa_summary',
            artifact_ref: `inline:${passedQa.qa_result_id}:qa`,
          },
        ]);
        qaResults.push(passedQa);
      }

      await orderService.markQaCompleted(order.order_id);
      await orderService.markDeliveryReady(order.order_id);
      const latestVariants = await variantService.getVariantsForOrder(order.order_id);
      const delivery = await deliveryService.buildDeliveryBundle(order, latestVariants, qaResults, {
        metadata: {
          source: 'webstudio_demo_packaging_service',
          qa_mode: 'placeholder',
        },
      });
      await orderService.markWaitingForClientChoice(order.order_id);

      const surface = await surfaceService.buildOrderSurface({ order_id: order.order_id });

      return Object.freeze({
        order_id: order.order_id,
        delivery_id: delivery.delivery_id,
        variant_ids: latestVariants.map((variant) => variant.variant_id),
        qa_result_ids: qaResults.map((row) => row.qa_result_id),
        child_task_ids: latestVariants.map((variant) => variant.child_task_id),
        surface,
      });
    },

    async buildDemoDeliverySurface({ order_id }) {
      return surfaceService.buildOrderSurface({ order_id });
    },
  });
}

module.exports = {
  createWebStudioDemoPackagingService,
  buildDemoBrief,
};
