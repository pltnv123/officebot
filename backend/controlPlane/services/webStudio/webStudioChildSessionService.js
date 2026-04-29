function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createChildSessionId(orderId, branchName) {
  return `ws-child-session-${orderId}-${String(branchName).toLowerCase()}`;
}

function createChildAgentId(branchName) {
  return `ws-agent-webstudio-variant-${String(branchName).toLowerCase()}`;
}

function createChildWorkspaceKey(orderId, branchName) {
  return `ws-workspace-${orderId}-${String(branchName).toLowerCase()}`;
}

function createChildWorkspacePath(orderId, branchName) {
  return `/tmp/webstudio/${orderId}/${String(branchName).toLowerCase()}`;
}

function getDesignDirection(branchName) {
  if (branchName === 'A') {
    return {
      direction: 'premium conversion landing',
      focus: 'luxury/premium visual hierarchy, strong CTA, trust blocks, polished first screen',
    };
  }
  if (branchName === 'B') {
    return {
      direction: 'fast pragmatic business site',
      focus: 'clarity, speed, service explanation, simple structure, strong contact path',
    };
  }
  return {
    direction: 'bold creative experimental concept',
    focus: 'memorable visual concept, distinctive sections, stronger brand personality',
  };
}

function createWebStudioChildSessionService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioTaskFlowBindings || !repositories.webStudioChildSessions) {
    throw new Error('webStudioChildSessionService requires webStudio repositories including child sessions');
  }

  return Object.freeze({
    buildVariantExecutionSpec(order, variant, binding) {
      const direction = getDesignDirection(variant.branch_name);
      return Object.freeze({
        order_id: order.order_id,
        variant_id: variant.variant_id,
        branch_name: variant.branch_name,
        design_direction: direction.direction,
        focus: direction.focus,
        normalized_brief_summary: clone(order.normalized_brief || null),
        concept_summary: variant.concept_summary,
        acceptance_criteria: clone(order.normalized_brief?.acceptance_criteria || []),
        required_artifacts: [
          'variant_concept_summary',
          'layout_direction_note',
          'qa_ready_payload',
        ],
        prohibited_actions: [
          'modify_other_variant_contexts',
          'claim_browser_verification_without_evidence',
          'use_shared_placeholder_not_allowed',
        ],
        qa_requirements: [
          'provide qa summary',
          'preserve traceability to variant_id',
          'preserve governed/taskflow identity references',
        ],
        governed_flow_id: binding.governed_flow_id,
        taskflow_id: binding.taskflow_id,
        binding_id: binding.binding_id,
      });
    },

    async createChildSessionForVariant(orderId, variantId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) {
        throw new Error(`WebStudio order not found: ${orderId}`);
      }
      const binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
      if (!binding || !binding.governed_flow_id || !binding.taskflow_id) {
        throw new Error(`TaskFlow binding missing for order: ${orderId}`);
      }
      const variant = await repositories.webStudioVariants.getVariantById({ variant_id: variantId });
      if (!variant) {
        throw new Error(`WebStudio variant not found: ${variantId}`);
      }
      if (variant.order_id !== orderId) {
        throw new Error(`Variant does not belong to order: ${variantId}`);
      }

      const existing = await repositories.webStudioChildSessions.getChildSessionByVariantId({ variant_id: variantId });
      if (existing) {
        return existing;
      }

      const now = nowIso();
      const branchName = variant.branch_name;
      const child_session = {
        child_session_id: options.child_session_id || createChildSessionId(orderId, branchName),
        order_id: orderId,
        variant_id: variant.variant_id,
        branch_name: branchName,
        child_task_id: variant.child_task_id || null,
        child_agent_id: options.child_agent_id || createChildAgentId(branchName),
        child_workspace_key: options.child_workspace_key || createChildWorkspaceKey(orderId, branchName),
        child_workspace_path: options.child_workspace_path || createChildWorkspacePath(orderId, branchName),
        governed_flow_id: binding.governed_flow_id,
        taskflow_id: binding.taskflow_id,
        binding_id: binding.binding_id,
        source: options.source || 'bounded_local_child_session_identity',
        openclaw_native: Boolean(options.openclaw_native || false),
        isolation_mode: options.isolation_mode || 'per_variant_workspace',
        context_mode: options.context_mode || 'bounded_local',
        status: options.status || 'ready',
        execution_spec: clone(options.execution_spec || this.buildVariantExecutionSpec(order, variant, binding)),
        migration_target: options.migration_target || 'OpenClaw sessions_spawn / sub-agents',
        created_at: now,
        updated_at: now,
      };

      const created = await repositories.webStudioChildSessions.createChildSession({ child_session });
      await repositories.webStudioVariants.updateVariantById({
        variant_id: variant.variant_id,
        patch: {
          child_session_id: created.child_session_id,
          child_agent_id: created.child_agent_id,
          child_workspace_key: created.child_workspace_key,
          child_workspace_path: created.child_workspace_path,
          child_execution_status: created.status,
          updated_at: nowIso(),
        },
      });
      return created;
    },

    async createChildSessionsForOrderVariants(orderId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) {
        throw new Error(`WebStudio order not found: ${orderId}`);
      }
      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      if (variants.length !== 3) {
        throw new Error(`Expected exactly 3 variants for order: ${orderId}`);
      }

      const created = [];
      for (const variant of variants.sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)))) {
        created.push(await this.createChildSessionForVariant(orderId, variant.variant_id, options));
      }
      return created;
    },

    async getChildSessionsForOrder(orderId) {
      const rows = await repositories.webStudioChildSessions.listChildSessionsByOrderId({ order_id: orderId });
      return rows.sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)));
    },

    async getChildSessionForVariant(variantId) {
      return repositories.webStudioChildSessions.getChildSessionByVariantId({ variant_id: variantId });
    },

    async markChildSessionReady(childSessionId) {
      return repositories.webStudioChildSessions.updateChildSessionById({
        child_session_id: childSessionId,
        patch: {
          status: 'ready',
          updated_at: nowIso(),
        },
      });
    },
  });
}

module.exports = {
  createWebStudioChildSessionService,
};
