const VARIANT_STATUSES = Object.freeze([
  'planned',
  'spawned',
  'building',
  'qa_pending',
  'qa_passed',
  'qa_failed',
  'packaged',
  'placeholder',
]);

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createVariantId(branchName) {
  return `ws-variant-${branchName.toLowerCase()}-${Date.now()}`;
}

function createChildTaskId(branchName) {
  return `ws-child-task-${branchName.toLowerCase()}-${Date.now()}`;
}

function buildConceptSummary(branchName, normalizedBrief = null) {
  const projectType = normalizedBrief?.project_type || 'landing_page';
  if (branchName === 'A') return `${projectType}: conservative conversion-focused concept`;
  if (branchName === 'B') return `${projectType}: premium editorial concept`;
  return `${projectType}: bold experimental concept`;
}

const { buildPrimaryVariantProfile } = require('./webStudioPrimaryVariantService');

function createWebStudioVariantService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioVariants || !repositories.tasks) {
    throw new Error('webStudioVariantService requires repositories.webStudioVariants and repositories.tasks');
  }

  return Object.freeze({
    async createThreeVariants(order, options = {}) {
      if (!order || !order.order_id) {
        throw new Error('createThreeVariants requires order');
      }

      const branches = ['A', 'B', 'C'];
      const created = [];
      for (const branchName of branches) {
        const now = nowIso();
        const variant_id = createVariantId(branchName);
        const child_task_id = createChildTaskId(branchName);

        const childTask = await repositories.tasks.createTask({
          task: {
            task_id: child_task_id,
            root_task_id: order.order_id,
            parent_task_id: options.parent_task_id || null,
            task_kind: 'webstudio_variant_build',
            status: 'created',
            priority: 0,
            task_scope_json: {
              order_id: order.order_id,
              branch_name: branchName,
            },
            input_payload_json: {
              webstudio_order_id: order.order_id,
              webstudio_variant_id: variant_id,
              branch_name: branchName,
              normalized_brief: clone(order.normalized_brief || null),
            },
            spawn_depth: 0,
            active_child_count: 0,
            spawn_budget_used: 0,
            spawn_budget_limit: 0,
            retry_count: 0,
            max_retries: 0,
            checkpoint_seq: 0,
            created_at: now,
            updated_at: now,
          },
        });

        const primaryProfile = buildPrimaryVariantProfile({ branch_name: branchName });
        const variant = await repositories.webStudioVariants.createVariant({
          variant: {
            variant_id,
            order_id: order.order_id,
            branch_name: branchName,
            concept_summary: buildConceptSummary(branchName, order.normalized_brief),
            status: branchName === 'B' ? 'spawned' : 'placeholder',
            child_task_id: childTask.task_id,
            child_session_id: null,
            artifacts: [],
            qa_result_id: null,
            quality_level: primaryProfile.quality_level,
            implementation_status: primaryProfile.implementation_status,
            is_primary_recommendation: primaryProfile.is_primary_recommendation,
            placeholder_reason: primaryProfile.placeholder_reason,
            variant_source: primaryProfile.source,
            production_ready: primaryProfile.production_ready,
            created_at: now,
            updated_at: now,
            metadata: {
              source: 'webstudio_slice_001',
              primary_variant_policy: true,
            },
          },
        });

        created.push(variant);
      }

      return Object.freeze(created);
    },

    async linkVariantChildTask(variantId, childTaskId) {
      return repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          child_task_id: childTaskId,
          updated_at: nowIso(),
        },
      });
    },

    async markVariantBuilding(variantId) {
      return repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          status: 'building',
          updated_at: nowIso(),
        },
      });
    },

    async markVariantQAPending(variantId) {
      return repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          status: 'qa_pending',
          updated_at: nowIso(),
        },
      });
    },

    async markVariantQaPassed(variantId, qa_result_id) {
      return repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          status: 'qa_passed',
          qa_result_id,
          updated_at: nowIso(),
        },
      });
    },

    async markVariantQaFailed(variantId, qa_result_id) {
      return repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          status: 'qa_failed',
          qa_result_id,
          updated_at: nowIso(),
        },
      });
    },

    async markVariantPackaged(variantId, artifacts) {
      return repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          status: 'packaged',
          artifacts: clone(artifacts || []),
          updated_at: nowIso(),
        },
      });
    },

    async getVariantsForOrder(orderId) {
      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      return variants.sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)));
    },
  });
}

module.exports = {
  VARIANT_STATUSES,
  createWebStudioVariantService,
};
