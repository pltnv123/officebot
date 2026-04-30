const crypto = require('crypto');
const { createWebStudioTaskFlowBindingService } = require('./webStudioTaskFlowBindingService');
const { createWebStudioOrderService } = require('./webStudioOrderService');

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function isNonEmptyStructuredInput(value) {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (!value || typeof value !== 'object') {
    return false;
  }
  return Object.values(value).some((entry) => {
    if (Array.isArray(entry)) return entry.length > 0;
    if (entry && typeof entry === 'object') return Object.keys(entry).length > 0;
    return String(entry || '').trim().length > 0;
  });
}

function buildRevisionRequestId(orderId, branchName, revisionNumber) {
  return `ws-revision-${orderId}-${String(branchName).toLowerCase()}-${String(revisionNumber).padStart(4, '0')}`;
}

function stableDeltaHash(deltaBrief) {
  return crypto.createHash('sha1').update(JSON.stringify(deltaBrief)).digest('hex').slice(0, 12);
}

function buildRevisionDeltaBrief(rawDeltaBrief, selectedVariant, order) {
  if (!isNonEmptyStructuredInput(rawDeltaBrief)) {
    throw new Error('Revision delta brief must be non-empty');
  }

  if (typeof rawDeltaBrief === 'string') {
    return Object.freeze({
      requested_changes: [rawDeltaBrief.trim()],
      priority: 'normal',
      affected_sections: normalizeArray(order?.normalized_brief?.required_sections || []),
      constraints: ['preserve_base_structure'],
      customer_notes: rawDeltaBrief.trim(),
      acceptance_delta: [`Apply requested revision to selected variant ${selectedVariant.branch_name}`],
    });
  }

  return Object.freeze({
    requested_changes: normalizeArray(rawDeltaBrief.requested_changes || rawDeltaBrief.requestedChanges || [rawDeltaBrief.customer_notes || rawDeltaBrief.customerNotes].filter(Boolean)),
    priority: String(rawDeltaBrief.priority || 'normal').trim() || 'normal',
    affected_sections: normalizeArray(rawDeltaBrief.affected_sections || rawDeltaBrief.affectedSections || order?.normalized_brief?.required_sections || []),
    constraints: normalizeArray(rawDeltaBrief.constraints || ['preserve_base_structure']),
    customer_notes: String(rawDeltaBrief.customer_notes || rawDeltaBrief.customerNotes || '').trim(),
    acceptance_delta: normalizeArray(rawDeltaBrief.acceptance_delta || rawDeltaBrief.acceptanceDelta || [`Apply revision request to selected variant ${selectedVariant.branch_name}`]),
  });
}

function createWebStudioRevisionService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioTaskFlowBindings || !repositories.webStudioDeliveryBundles || !repositories.webStudioChildSessions || !repositories.webStudioBuildArtifacts || !repositories.webStudioBrowserQAEvidence || !repositories.webStudioRevisionRequests) {
    throw new Error('webStudioRevisionService requires webStudio repositories including revision requests');
  }

  const bindingService = createWebStudioTaskFlowBindingService({ repositories });
  const orderService = createWebStudioOrderService({ repositories });

  async function getOrderSelectionContext(orderId, selectedVariantId = null) {
    const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
    if (!order) throw new Error(`WebStudio order not found: ${orderId}`);

    const binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
    if (!binding) throw new Error(`TaskFlow binding not found for order: ${orderId}`);

    const delivery = await repositories.webStudioDeliveryBundles.getLatestDeliveryBundleByOrderId({ order_id: orderId });
    if (!delivery) throw new Error(`Delivery bundle not found for order: ${orderId}`);

    const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
    if (variants.length !== 3) throw new Error(`Expected exactly 3 variants for order: ${orderId}`);

    const variant = selectedVariantId
      ? variants.find((row) => row.variant_id === selectedVariantId) || null
      : (order.selected_variant_id ? variants.find((row) => row.variant_id === order.selected_variant_id) || null : null);

    if (selectedVariantId && !variant) {
      throw new Error(`Selected variant does not belong to order: ${selectedVariantId}`);
    }

    const buildArtifacts = (await repositories.webStudioBuildArtifacts.listBuildArtifactsByOrderId({ order_id: orderId }))
      .filter((row) => (row.artifact_type || 'initial') !== 'revision');
    if (buildArtifacts.length !== 3) throw new Error(`Expected exactly 3 build artifacts for order: ${orderId}`);

    const browserEvidence = (await repositories.webStudioBrowserQAEvidence.listBrowserEvidenceByOrderId({ order_id: orderId }))
      .filter((row) => (row.evidence_scope || 'initial') !== 'revision');
    if (browserEvidence.length !== 3) throw new Error(`Expected exactly 3 browser QA evidence records for order: ${orderId}`);

    return {
      order,
      binding,
      delivery,
      variants,
      variant,
      buildArtifact: variant ? await repositories.webStudioBuildArtifacts.getBuildArtifactByVariantId({ variant_id: variant.variant_id }) : null,
      browserEvidence: variant ? await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceByVariantId({ variant_id: variant.variant_id }) : null,
      childSession: variant ? await repositories.webStudioChildSessions.getChildSessionByVariantId({ variant_id: variant.variant_id }) : null,
    };
  }

  return Object.freeze({
    buildRevisionDeltaBrief,

    async selectVariantForOrder(orderId, selectedVariantId, options = {}) {
      const context = await getOrderSelectionContext(orderId, selectedVariantId);
      const { order, binding, delivery, variant } = context;

      if (order.selected_variant_id && order.selected_variant_id !== selectedVariantId && !options.allowOverride) {
        throw new Error(`Order already selected different variant: ${order.selected_variant_id}`);
      }
      if (binding.selected_variant_id && binding.selected_variant_id !== selectedVariantId && !options.allowOverride) {
        throw new Error(`TaskFlow binding already selected different variant: ${binding.selected_variant_id}`);
      }

      if (order.selected_variant_id === selectedVariantId && binding.selected_variant_id === selectedVariantId) {
        return {
          order: await repositories.webStudioOrders.getOrderById({ order_id: orderId }),
          binding: await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId }),
          delivery: await repositories.webStudioDeliveryBundles.getLatestDeliveryBundleByOrderId({ order_id: orderId }),
          selected_variant: clone(variant),
          idempotent: true,
        };
      }

      const waitingAllowed = ['waiting_for_client_choice', 'selected_variant_received', 'revision_ready'];
      if (!waitingAllowed.includes(order.status)) {
        throw new Error(`Order is not in selectable state: ${orderId}`);
      }

      let updatedBinding = binding;
      if (binding.waiting_state?.is_waiting && binding.waiting_state.waiting_reason === 'client_choice') {
        updatedBinding = await bindingService.resumeOrderWithClientChoice(orderId, selectedVariantId, options);
      } else {
        updatedBinding = await repositories.webStudioTaskFlowBindings.updateBindingById({
          binding_id: binding.binding_id,
          patch: {
            status: 'revision_ready',
            selected_variant_id: selectedVariantId,
            waiting_state: {
              ...(binding.waiting_state || {}),
              is_waiting: false,
              waiting_reason: null,
              resumed_at: nowIso(),
              allowed_resume_actions: [],
            },
            updated_at: nowIso(),
          },
        });
        await orderService.markRevisionReady(orderId, { selected_variant_id: selectedVariantId });
        await repositories.webStudioDeliveryBundles.updateDeliveryBundleById({
          delivery_id: delivery.delivery_id,
          patch: {
            status: 'selected',
            selected_variant_id: selectedVariantId,
            updated_at: nowIso(),
          },
        });
      }

      const updatedOrder = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      const updatedDelivery = await repositories.webStudioDeliveryBundles.getLatestDeliveryBundleByOrderId({ order_id: orderId });
      return {
        order: updatedOrder,
        binding: updatedBinding,
        delivery: updatedDelivery,
        selected_variant: clone(variant),
        idempotent: false,
      };
    },

    async createRevisionRequest(orderId, selectedVariantId, rawDeltaBrief, options = {}) {
      const selection = await this.selectVariantForOrder(orderId, selectedVariantId, options);
      const context = await getOrderSelectionContext(orderId, selectedVariantId);
      const { order, binding, variant, buildArtifact, browserEvidence, childSession } = context;

      if (!buildArtifact) throw new Error(`Build artifact missing for selected variant: ${selectedVariantId}`);
      if (!browserEvidence) throw new Error(`Browser evidence missing for selected variant: ${selectedVariantId}`);
      if (!childSession) throw new Error(`Child session missing for selected variant: ${selectedVariantId}`);

      const deltaBrief = buildRevisionDeltaBrief(rawDeltaBrief, variant, order);
      const deltaHash = stableDeltaHash(deltaBrief);
      const existingRequests = await repositories.webStudioRevisionRequests.listRevisionRequestsByOrderId({ order_id: orderId });
      const matching = existingRequests.find((row) => row.selected_variant_id === selectedVariantId && row.delta_hash === deltaHash) || null;
      if (matching) {
        return matching;
      }

      const sameBranchRequests = existingRequests.filter((row) => row.selected_variant_id === selectedVariantId);
      const revisionNumber = sameBranchRequests.length + 1;
      const now = nowIso();
      const revisionRequest = {
        revision_request_id: options.revision_request_id || buildRevisionRequestId(orderId, variant.branch_name, revisionNumber),
        order_id: orderId,
        selected_variant_id: selectedVariantId,
        original_variant_id: selectedVariantId,
        branch_name: variant.branch_name,
        revision_number: revisionNumber,
        governed_flow_id: binding.governed_flow_id,
        taskflow_id: binding.taskflow_id,
        binding_id: binding.binding_id,
        child_session_id: childSession.child_session_id,
        child_agent_id: childSession.child_agent_id,
        child_workspace_key: childSession.child_workspace_key,
        build_artifact_id: buildArtifact.build_artifact_id,
        browser_evidence_id: browserEvidence.browser_evidence_id,
        parent_build_artifact_id: buildArtifact.build_artifact_id,
        delta_hash: deltaHash,
        delta_brief: deltaBrief,
        raw_delta_brief: clone(rawDeltaBrief),
        status: 'requested',
        revision_lane_status: 'ready',
        created_at: now,
        updated_at: now,
        metadata: clone(options.metadata || {
          source: 'webstudio_revision_service',
        }),
      };

      const created = await repositories.webStudioRevisionRequests.createRevisionRequest({ revision_request: revisionRequest });

      await repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          status: 'revision_requested',
          selected_variant_id: selectedVariantId,
          latest_revision_request_id: created.revision_request_id,
          revision_lane_status: 'ready',
          updated_at: nowIso(),
        },
      });

      await repositories.webStudioTaskFlowBindings.updateBindingById({
        binding_id: binding.binding_id,
        patch: {
          status: 'revision_ready',
          selected_variant_id: selectedVariantId,
          latest_revision_request_id: created.revision_request_id,
          updated_at: nowIso(),
        },
      });

      const delivery = await repositories.webStudioDeliveryBundles.getLatestDeliveryBundleByOrderId({ order_id: orderId });
      if (delivery) {
        await repositories.webStudioDeliveryBundles.updateDeliveryBundleById({
          delivery_id: delivery.delivery_id,
          patch: {
            status: 'revision_requested',
            selected_variant_id: selectedVariantId,
            latest_revision_request_id: created.revision_request_id,
            revision_lane_status: 'ready',
            updated_at: nowIso(),
          },
        });
      }

      return created;
    },

    async getRevisionRequestsForOrder(orderId) {
      const rows = await repositories.webStudioRevisionRequests.listRevisionRequestsByOrderId({ order_id: orderId });
      return [...rows].sort((a, b) => {
        if (a.revision_number !== b.revision_number) return a.revision_number - b.revision_number;
        return String(a.created_at || '').localeCompare(String(b.created_at || ''));
      });
    },

    async getLatestRevisionRequest(orderId) {
      const rows = await this.getRevisionRequestsForOrder(orderId);
      return rows[rows.length - 1] || null;
    },

    async getRevisionSurface(orderId) {
      const context = await getOrderSelectionContext(orderId);
      const revisionRequests = await this.getRevisionRequestsForOrder(orderId);
      const latestRevisionRequest = revisionRequests[revisionRequests.length - 1] || null;

      return {
        selected_variant: context.variant ? {
          ...clone(context.variant),
          child_session_id: context.childSession?.child_session_id || null,
          build_artifact_id: context.buildArtifact?.build_artifact_id || null,
          browser_evidence_id: context.browserEvidence?.browser_evidence_id || null,
          preview_path: context.buildArtifact?.preview_path || null,
          html_path: context.buildArtifact?.html_path || null,
        } : null,
        revision_requests: revisionRequests.map(clone),
        latest_revision_request: clone(latestRevisionRequest),
        revision_lane: {
          status: latestRevisionRequest?.revision_lane_status || (context.order.selected_variant_id ? 'ready' : 'not_created'),
          selected_variant_id: context.order.selected_variant_id || null,
          revision_request_id: latestRevisionRequest?.revision_request_id || null,
          pending_execution: ['ready', 'pending_execution'].includes(latestRevisionRequest?.revision_lane_status || ''),
          next_action: latestRevisionRequest ? 'execute_selected_variant_revision' : (context.order.selected_variant_id ? 'create_revision_request' : 'select_variant'),
        },
      };
    },
  });
}

module.exports = {
  createWebStudioRevisionService,
  buildRevisionDeltaBrief,
};
