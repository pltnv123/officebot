const { createWebStudioOrderSurfaceService } = require('./webStudioOrderSurfaceService');
const { createWebStudioBuildArtifactService } = require('./webStudioBuildArtifactService');
const { createWebStudioRevisionService } = require('./webStudioRevisionService');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

const PRIMARY_BRANCH = 'B';
const PRIMARY_REASON = 'First real MVP implementation path';
const PLACEHOLDER_REASON = 'Reserved sibling branch for future full multi-variant execution';

function buildPrimaryVariantProfile(variant) {
  const isPrimary = String(variant?.branch_name || '') === PRIMARY_BRANCH;
  return {
    quality_level: isPrimary ? 'primary' : 'placeholder',
    implementation_status: isPrimary ? 'real' : 'placeholder',
    is_primary_recommendation: isPrimary,
    primary_reason: isPrimary ? PRIMARY_REASON : null,
    placeholder_reason: isPrimary ? null : PLACEHOLDER_REASON,
    variant_source: isPrimary ? 'primary_real_variant' : 'placeholder_variant',
    mvp_readiness_status: isPrimary ? 'operator_demo_ready' : 'placeholder_only',
    production_ready: false,
  };
}

function createWebStudioPrimaryVariantService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioVariants || !repositories.webStudioOrders) {
    throw new Error('webStudioPrimaryVariantService requires webStudio variants and orders repositories');
  }

  const surfaceService = createWebStudioOrderSurfaceService({ repositories });
  const buildArtifactService = createWebStudioBuildArtifactService({ repositories, rootDir: repositories.__ROOT_DIR__ || process.cwd() });
  const revisionService = createWebStudioRevisionService({ repositories });

  return Object.freeze({
    buildPrimaryVariantProfile,

    async markPrimaryVariantForOrder(orderId, branchName = PRIMARY_BRANCH, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) throw new Error(`WebStudio order not found: ${orderId}`);
      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      const primaryVariant = variants.find((variant) => String(variant.branch_name) === String(branchName));
      if (!primaryVariant) throw new Error(`Primary variant branch not found for order ${orderId}: ${branchName}`);

      const updated = [];
      for (const variant of variants) {
        const profile = buildPrimaryVariantProfile({ branch_name: variant.branch_name });
        updated.push(await repositories.webStudioVariants.updateVariantById({
          variant_id: variant.variant_id,
          patch: {
            ...profile,
            status: variant.branch_name === branchName ? (variant.status === 'placeholder' ? 'spawned' : variant.status) : 'placeholder',
            metadata: {
              ...(clone(variant.metadata || {})),
              primary_variant_policy: true,
              ...(options.metadata || {}),
            },
          },
        }));
      }

      const sorted = updated.sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)));
      return {
        primary_variant: sorted.find((variant) => variant.branch_name === branchName),
        placeholder_variants: sorted.filter((variant) => variant.branch_name !== branchName),
      };
    },

    async getPrimaryVariantForOrder(orderId) {
      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      const primaryVariant = variants.find((variant) => String(variant.branch_name) === PRIMARY_BRANCH) || null;
      const placeholderVariants = variants.filter((variant) => String(variant.branch_name) !== PRIMARY_BRANCH);
      return {
        primary_variant: primaryVariant,
        placeholder_variants: placeholderVariants,
        validation_summary: {
          has_primary_variant: Boolean(primaryVariant),
          placeholder_count: placeholderVariants.length,
          placeholders_not_production_ready: placeholderVariants.every((variant) => variant.production_ready === false),
        },
      };
    },

    async enforcePrimaryVariantDeliveryPolicy(orderId) {
      const surface = await surfaceService.buildOrderSurface({ order_id: orderId });
      if (!surface) throw new Error(`WebStudio order surface not found: ${orderId}`);
      return {
        primary_variant: surface.primary_variant,
        placeholder_variants: surface.placeholder_variants,
        primary_variant_ready: Boolean(surface.primary_variant?.build_artifact_id && surface.primary_variant?.preview_path),
        placeholders_are_not_production_ready: (surface.placeholder_variants || []).every((variant) => variant.production_ready === false),
        delivery_recommendation: 'Use Variant B as the first real MVP preview',
      };
    },

    async upgradePrimaryVariantBuildQuality(orderId, options = {}) {
      const primaryInfo = await this.getPrimaryVariantForOrder(orderId);
      if (!primaryInfo.primary_variant) throw new Error(`Primary variant missing for order: ${orderId}`);
      return buildArtifactService.createBuildArtifactForVariant(orderId, primaryInfo.primary_variant.variant_id, options);
    },

    async ensurePrimaryRevisionPath(orderId) {
      const primaryInfo = await this.getPrimaryVariantForOrder(orderId);
      if (!primaryInfo.primary_variant) throw new Error(`Primary variant missing for order: ${orderId}`);
      await revisionService.selectVariantForOrder(orderId, primaryInfo.primary_variant.variant_id);
      return repositories.webStudioOrders.getOrderById({ order_id: orderId });
    },

    async applyPrimaryVariantPolicyToVariant(variantId) {
      const variant = await repositories.webStudioVariants.getVariantById({ variant_id: variantId });
      if (!variant) throw new Error(`WebStudio variant not found: ${variantId}`);
      const profile = buildPrimaryVariantProfile(variant);
      return repositories.webStudioVariants.updateVariantById({
        variant_id: variantId,
        patch: {
          ...profile,
          metadata: {
            ...(clone(variant.metadata || {})),
            primary_variant_policy: true,
          },
        },
      });
    },

    async applyPrimaryVariantPolicyToOrder(orderId) {
      const result = await this.markPrimaryVariantForOrder(orderId, PRIMARY_BRANCH);
      return [result.primary_variant, ...result.placeholder_variants].filter(Boolean);
    },
  });
}

module.exports = {
  PRIMARY_BRANCH,
  PRIMARY_REASON,
  PLACEHOLDER_REASON,
  buildPrimaryVariantProfile,
  createWebStudioPrimaryVariantService,
};