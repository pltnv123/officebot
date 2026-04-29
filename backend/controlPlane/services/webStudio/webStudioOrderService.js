const ORDER_STATUSES = Object.freeze([
  'intake_received',
  'brief_normalized',
  'variants_spawned',
  'variants_completed',
  'qa_completed',
  'delivery_ready',
  'waiting_for_client_choice',
  'selected_variant_received',
  'revision_ready',
  'revision_requested',
  'completed',
  'failed',
]);

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createOrderId() {
  return `ws-order-${Date.now()}`;
}

function normalizeArray(value, fallback = []) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : fallback;
}

function buildNormalizedBrief(rawBrief = {}) {
  const brief = typeof rawBrief === 'string' ? { raw_text: rawBrief } : (rawBrief || {});
  const projectType = String(brief.project_type || brief.projectType || 'landing_page').trim() || 'landing_page';
  const businessGoal = String(brief.business_goal || brief.businessGoal || brief.goal || 'present_offer_clearly').trim() || 'present_offer_clearly';
  const styleDirection = String(brief.style_direction || brief.styleDirection || 'modern_clean').trim() || 'modern_clean';

  return Object.freeze({
    project_type: projectType,
    target_audience: String(brief.target_audience || brief.targetAudience || 'general_business_audience').trim() || 'general_business_audience',
    business_goal: businessGoal,
    required_sections: normalizeArray(brief.required_sections || brief.requiredSections, ['hero', 'offer', 'benefits', 'cta']),
    style_direction: styleDirection,
    forbidden_patterns: normalizeArray(brief.forbidden_patterns || brief.forbiddenPatterns, ['misleading_claims']),
    deliverables: normalizeArray(brief.deliverables, ['three_variant_concepts', 'qa_summary', 'delivery_bundle']),
    acceptance_criteria: normalizeArray(brief.acceptance_criteria || brief.acceptanceCriteria, [
      'three_distinct_variants_exist',
      'each_variant_has_qa_summary',
      'delivery_bundle_is_present',
    ]),
    technical_constraints: clone(brief.technical_constraints || brief.technicalConstraints || null),
    content_requirements: clone(brief.content_requirements || brief.contentRequirements || null),
    seo_requirements: clone(brief.seo_requirements || brief.seoRequirements || null),
  });
}

function ensureStatus(status) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`Unsupported web-studio order status: ${status}`);
  }
}

function createWebStudioOrderService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioOrders) {
    throw new Error('webStudioOrderService requires repositories.webStudioOrders');
  }

  return Object.freeze({
    async createOrder(rawBrief, options = {}) {
      const now = nowIso();
      const order = {
        order_id: options.order_id || createOrderId(),
        client_id: options.client_id || null,
        source: options.source || 'demo_webstudio',
        raw_brief: typeof rawBrief === 'string' ? { raw_text: rawBrief } : clone(rawBrief || {}),
        normalized_brief: null,
        status: 'intake_received',
        created_at: now,
        updated_at: now,
        governed_flow_id: options.governed_flow_id || null,
        taskflow_id: options.taskflow_id || null,
        metadata: clone(options.metadata || null),
      };
      return repositories.webStudioOrders.createOrder({ order });
    },

    async normalizeBrief(orderId) {
      const current = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!current) {
        throw new Error(`WebStudio order not found: ${orderId}`);
      }
      const normalized_brief = buildNormalizedBrief(current.raw_brief);
      return repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          normalized_brief,
          status: 'brief_normalized',
          updated_at: nowIso(),
        },
      });
    },

    async markVariantsSpawned(orderId, patch = {}) {
      ensureStatus('variants_spawned');
      return repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          status: 'variants_spawned',
          updated_at: nowIso(),
          ...clone(patch),
        },
      });
    },

    async markQaCompleted(orderId) {
      return repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          status: 'qa_completed',
          updated_at: nowIso(),
        },
      });
    },

    async markDeliveryReady(orderId, patch = {}) {
      return repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          status: 'delivery_ready',
          updated_at: nowIso(),
          ...clone(patch),
        },
      });
    },

    async markWaitingForClientChoice(orderId, patch = {}) {
      return repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          status: 'waiting_for_client_choice',
          updated_at: nowIso(),
          ...clone(patch),
        },
      });
    },

    async markSelectedVariantReceived(orderId, selected_variant_id) {
      return repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          status: 'selected_variant_received',
          selected_variant_id,
          updated_at: nowIso(),
        },
      });
    },

    async markRevisionReady(orderId, patch = {}) {
      return repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          status: 'revision_ready',
          updated_at: nowIso(),
          ...clone(patch),
        },
      });
    },

    async getOrder(orderId) {
      return repositories.webStudioOrders.getOrderById({ order_id: orderId });
    },

    buildNormalizedBrief,
  });
}

module.exports = {
  ORDER_STATUSES,
  createWebStudioOrderService,
};
