const BINDING_STATUSES = Object.freeze([
  'created',
  'bound',
  'waiting_for_client_choice',
  'client_choice_received',
  'revision_ready',
  'completed',
  'failed',
]);

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createBindingId(orderId) {
  return `ws-taskflow-binding-${orderId}`;
}

function createGovernedFlowId(orderId) {
  return `ws-governed-flow-${orderId}`;
}

function createTaskflowId(orderId) {
  return `ws-taskflow-${orderId}`;
}

function buildWaitingState({ is_waiting = false, waiting_reason = null, waiting_since = null, allowed_resume_actions = [], resumed_at = null } = {}) {
  return Object.freeze({
    is_waiting: Boolean(is_waiting),
    waiting_reason,
    waiting_since,
    allowed_resume_actions: Array.isArray(allowed_resume_actions) ? [...allowed_resume_actions] : [],
    resumed_at,
  });
}

function assertStatus(status) {
  if (!BINDING_STATUSES.includes(status)) {
    throw new Error(`Unsupported web-studio taskflow binding status: ${status}`);
  }
}

function createWebStudioTaskFlowBindingService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioTaskFlowBindings || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioDeliveryBundles) {
    throw new Error('webStudioTaskFlowBindingService requires webStudio repositories including taskflow bindings');
  }

  return Object.freeze({
    async bindOrderToGovernedFlow(orderId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) {
        throw new Error(`WebStudio order not found: ${orderId}`);
      }

      const existing = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
      if (existing) {
        if (!order.governed_flow_id || !order.taskflow_id) {
          await repositories.webStudioOrders.updateOrderById({
            order_id: orderId,
            patch: {
              governed_flow_id: existing.governed_flow_id,
              taskflow_id: existing.taskflow_id,
              updated_at: nowIso(),
            },
          });
        }
        return existing;
      }

      const now = nowIso();
      const binding = {
        binding_id: options.binding_id || createBindingId(orderId),
        order_id: orderId,
        governed_flow_id: options.governed_flow_id || order.governed_flow_id || createGovernedFlowId(orderId),
        taskflow_id: options.taskflow_id || order.taskflow_id || createTaskflowId(orderId),
        source: options.source || 'bounded_local_taskflow_identity',
        openclaw_native: Boolean(options.openclaw_native || false),
        migration_target: options.migration_target || 'OpenClaw TaskFlow',
        status: 'bound',
        waiting_state: buildWaitingState(),
        selected_variant_id: null,
        resume_history: [],
        created_at: now,
        updated_at: now,
      };

      assertStatus(binding.status);
      const created = await repositories.webStudioTaskFlowBindings.createBinding({ binding });
      await repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          governed_flow_id: created.governed_flow_id,
          taskflow_id: created.taskflow_id,
          updated_at: nowIso(),
        },
      });
      return created;
    },

    async setOrderWaitingForClientChoice(orderId, deliveryId) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) {
        throw new Error(`WebStudio order not found: ${orderId}`);
      }
      const binding = await this.bindOrderToGovernedFlow(orderId);
      const delivery = await repositories.webStudioDeliveryBundles.getDeliveryBundleById({ delivery_id: deliveryId });
      if (!delivery || delivery.order_id !== orderId) {
        throw new Error(`Delivery bundle not found for order waiting transition: ${deliveryId}`);
      }

      const waiting_state = buildWaitingState({
        is_waiting: true,
        waiting_reason: 'client_choice',
        waiting_since: nowIso(),
        allowed_resume_actions: ['select_variant', 'request_revision', 'cancel'],
        resumed_at: null,
      });

      const updated = await repositories.webStudioTaskFlowBindings.updateBindingById({
        binding_id: binding.binding_id,
        patch: {
          status: 'waiting_for_client_choice',
          waiting_state,
          updated_at: nowIso(),
        },
      });

      await repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          status: 'waiting_for_client_choice',
          governed_flow_id: updated.governed_flow_id,
          taskflow_id: updated.taskflow_id,
          updated_at: nowIso(),
        },
      });

      await repositories.webStudioDeliveryBundles.updateDeliveryBundleById({
        delivery_id: deliveryId,
        patch: {
          status: 'waiting_for_client_choice',
          governed_flow_id: updated.governed_flow_id,
          taskflow_id: updated.taskflow_id,
          waiting_reason: 'client_choice',
          updated_at: nowIso(),
        },
      });

      return updated;
    },

    async resumeOrderWithClientChoice(orderId, selectedVariantId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) {
        throw new Error(`WebStudio order not found: ${orderId}`);
      }

      const binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
      if (!binding) {
        throw new Error(`TaskFlow binding not found for order: ${orderId}`);
      }
      if (!binding.waiting_state || binding.waiting_state.is_waiting !== true || binding.waiting_state.waiting_reason !== 'client_choice') {
        throw new Error(`Order is not waiting_for_client_choice: ${orderId}`);
      }

      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      const selectedVariant = variants.find((variant) => variant.variant_id === selectedVariantId) || null;
      if (!selectedVariant) {
        throw new Error(`Selected variant does not belong to order: ${selectedVariantId}`);
      }

      const now = nowIso();
      const resumeEntry = Object.freeze({
        action: 'select_variant',
        selected_variant_id: selectedVariantId,
        actor: clone(options.actor || { actor_type: 'system', actor_id: 'webStudioTaskFlowBindingService' }),
        resumed_at: now,
      });

      const updated = await repositories.webStudioTaskFlowBindings.updateBindingById({
        binding_id: binding.binding_id,
        patch: {
          status: 'revision_ready',
          selected_variant_id: selectedVariantId,
          waiting_state: buildWaitingState({
            is_waiting: false,
            waiting_reason: null,
            waiting_since: binding.waiting_state.waiting_since || null,
            allowed_resume_actions: [],
            resumed_at: now,
          }),
          resume_history: [...(binding.resume_history || []), resumeEntry],
          updated_at: now,
        },
      });

      await repositories.webStudioOrders.updateOrderById({
        order_id: orderId,
        patch: {
          status: 'revision_ready',
          selected_variant_id: selectedVariantId,
          governed_flow_id: updated.governed_flow_id,
          taskflow_id: updated.taskflow_id,
          updated_at: nowIso(),
        },
      });

      const delivery = await repositories.webStudioDeliveryBundles.getLatestDeliveryBundleByOrderId({ order_id: orderId });
      if (delivery) {
        await repositories.webStudioDeliveryBundles.updateDeliveryBundleById({
          delivery_id: delivery.delivery_id,
          patch: {
            status: 'selected',
            selected_variant_id: selectedVariantId,
            updated_at: nowIso(),
          },
        });
      }

      return updated;
    },

    async getTaskFlowBindingSurface(orderId) {
      const binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
      return binding || null;
    },
  });
}

module.exports = {
  BINDING_STATUSES,
  createWebStudioTaskFlowBindingService,
};
