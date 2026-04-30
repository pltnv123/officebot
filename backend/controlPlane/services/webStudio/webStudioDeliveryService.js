const DELIVERY_STATUSES = Object.freeze([
  'assembling',
  'ready',
  'waiting_for_client_choice',
  'selected',
  'revision_requested',
  'completed',
]);

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createDeliveryId(orderId) {
  return `ws-delivery-${orderId}`;
}

function summarizeVariant(variant, qaResult) {
  return Object.freeze({
    variant_id: variant.variant_id,
    branch_name: variant.branch_name,
    concept_summary: variant.concept_summary,
    status: variant.status,
    quality_level: variant.quality_level || null,
    implementation_status: variant.implementation_status || null,
    is_primary_recommendation: Boolean(variant.is_primary_recommendation),
    placeholder_reason: variant.placeholder_reason || null,
    variant_source: variant.variant_source || null,
    production_ready: Boolean(variant.production_ready),
    child_task_id: variant.child_task_id || null,
    child_session_id: variant.child_session_id || null,
    qa_result_id: qaResult?.qa_result_id || null,
    qa_status: qaResult?.status || null,
    artifacts: clone(variant.artifacts || []),
    known_risks: clone(qaResult?.risks || []),
  });
}

function createWebStudioDeliveryService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioDeliveryBundles) {
    throw new Error('webStudioDeliveryService requires repositories.webStudioDeliveryBundles');
  }

  return Object.freeze({
    async buildDeliveryBundle(order, variants, qaResults, options = {}) {
      const now = nowIso();
      const qaByVariantId = new Map((qaResults || []).map((row) => [row.variant_id, row]));
      const summarizedVariants = (variants || []).map((variant) => summarizeVariant(variant, qaByVariantId.get(variant.variant_id)));
      const primaryVariant = summarizedVariants.find((variant) => variant.branch_name === 'B') || null;
      const placeholderVariants = summarizedVariants.filter((variant) => variant.branch_name !== 'B');
      const delivery_bundle = {
        delivery_id: options.delivery_id || createDeliveryId(order.order_id),
        order_id: order.order_id,
        variants: summarizedVariants,
        primary_variant: primaryVariant,
        placeholder_variants: placeholderVariants,
        status: 'ready',
        customer_summary: options.customer_summary || 'Variant B is the primary real MVP preview. Variants A and C remain honest placeholders for future expansion.',
        governed_flow_id: order.governed_flow_id || null,
        taskflow_id: order.taskflow_id || null,
        selected_variant_id: null,
        waiting_reason: null,
        created_at: now,
        updated_at: now,
        metadata: clone(options.metadata || {
          source: 'webstudio_slice_001',
          qa_mode: 'placeholder',
        }),
      };

      return repositories.webStudioDeliveryBundles.createDeliveryBundle({ delivery_bundle });
    },

    async getDeliverySurface(orderId) {
      return repositories.webStudioDeliveryBundles.getLatestDeliveryBundleByOrderId({ order_id: orderId });
    },
  });
}

module.exports = {
  DELIVERY_STATUSES,
  createWebStudioDeliveryService,
};
