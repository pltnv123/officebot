const fs = require('fs/promises');
const path = require('path');
const { createWebStudioRevisionService } = require('./webStudioRevisionService');

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function buildPublicDeliveryId(orderId) {
  return `ws-public-delivery-${orderId}`;
}

function publicPreviewRoot(rootDir, orderId, artifactId) {
  return path.join(
    rootDir,
    'backend',
    'controlPlane',
    'storage',
    '.first-governed-workflow-runtime',
    'webstudio-public-previews',
    orderId,
    artifactId,
  );
}

function safeSegment(value, label) {
  const normalized = String(value || '');
  if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
  return normalized;
}

async function copyIfExists(fromPath, toPath) {
  if (!fromPath) return false;
  if (!(await pathExists(fromPath))) return false;
  await fs.copyFile(fromPath, toPath);
  return true;
}

function buildQaSummary(initialPreviews, revisedPreview) {
  return {
    initial_preview_count: initialPreviews.length,
    initial_needs_review_count: initialPreviews.filter((row) => row.qa_status === 'needs_review').length,
    revised_browser_qa_status: revisedPreview?.revised_browser_qa_status || null,
    revised_preview_available: Boolean(revisedPreview),
  };
}

function createWebStudioPublicDeliveryService({ repositories, rootDir } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioBuildArtifacts || !repositories.webStudioBrowserQAEvidence || !repositories.webStudioTaskFlowBindings || !repositories.webStudioPublicDeliveryBundles) {
    throw new Error('webStudioPublicDeliveryService requires repositories including public delivery bundles');
  }
  if (!rootDir) {
    throw new Error('webStudioPublicDeliveryService requires rootDir');
  }

  const revisionService = createWebStudioRevisionService({ repositories });

  return Object.freeze({
    async publishPreviewArtifact(order, artifact, options = {}) {
      if (!artifact || !artifact.build_artifact_id) {
        throw new Error('Artifact is required for preview publishing');
      }
      if (!artifact.html_path) {
        throw new Error(`Artifact html_path missing: ${artifact.build_artifact_id}`);
      }
      if (!(await pathExists(artifact.html_path))) {
        throw new Error(`Artifact HTML path missing: ${artifact.html_path}`);
      }

      const orderId = safeSegment(order.order_id, 'orderId');
      const artifactId = safeSegment(artifact.build_artifact_id, 'artifactId');
      const publishedRoot = publicPreviewRoot(rootDir, orderId, artifactId);
      await fs.mkdir(publishedRoot, { recursive: true });

      const publishedHtmlPath = path.join(publishedRoot, 'index.html');
      const publishedCssPath = path.join(publishedRoot, 'styles.css');
      const publishedManifestPath = path.join(publishedRoot, 'manifest.json');

      await fs.copyFile(artifact.html_path, publishedHtmlPath);
      await copyIfExists(artifact.css_path, publishedCssPath);
      if (artifact.manifest_path && !(await copyIfExists(artifact.manifest_path, publishedManifestPath))) {
        throw new Error(`Artifact manifest path missing: ${artifact.manifest_path}`);
      }

      const previewRoutePath = `/api/webstudio-preview/${encodeURIComponent(orderId)}/${encodeURIComponent(artifactId)}/index.html`;
      const baseUrl = options.publicBaseUrl || null;
      const previewUrl = baseUrl ? `${String(baseUrl).replace(/\/$/, '')}${previewRoutePath}` : null;

      return {
        published_root: publishedRoot,
        published_html_path: publishedHtmlPath,
        published_manifest_path: artifact.manifest_path ? publishedManifestPath : null,
        preview_route_path: previewRoutePath,
        preview_url: previewUrl,
      };
    },

    async buildInitialVariantPreviewEntries(orderId, options = {}) {
      const variants = await repositories.webStudioVariants.listVariantsByOrderId({ order_id: orderId });
      if (variants.length !== 3) throw new Error(`Expected exactly 3 variants for order: ${orderId}`);
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      const sorted = [...variants].sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)));
      const rows = [];
      for (const variant of sorted) {
        const artifact = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: variant.build_artifact_id });
        if (!artifact) throw new Error(`Build artifact missing for variant: ${variant.variant_id}`);
        const evidence = variant.browser_evidence_id
          ? await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: variant.browser_evidence_id })
          : null;
        const published = await this.publishPreviewArtifact(order, artifact, options);
        rows.push({
          variant_id: variant.variant_id,
          branch_name: variant.branch_name,
          build_artifact_id: artifact.build_artifact_id,
          browser_evidence_id: evidence?.browser_evidence_id || variant.browser_evidence_id || null,
          published_root: published.published_root,
          published_html_path: published.published_html_path,
          published_manifest_path: published.published_manifest_path,
          preview_route_path: published.preview_route_path,
          preview_url: published.preview_url,
          qa_status: evidence?.status || variant.browser_qa_status || null,
          capture_status: evidence?.capture_status || variant.capture_status || null,
        });
      }
      return rows;
    },

    async buildRevisedPreviewEntry(orderId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      const latestRevisionRequest = await revisionService.getLatestRevisionRequest(orderId);
      if (!latestRevisionRequest || latestRevisionRequest.revision_execution_status !== 'completed' || !latestRevisionRequest.revised_build_artifact_id) {
        return null;
      }
      const revisedArtifact = await repositories.webStudioBuildArtifacts.getBuildArtifactById({ build_artifact_id: latestRevisionRequest.revised_build_artifact_id });
      if (!revisedArtifact) throw new Error(`Revised build artifact missing: ${latestRevisionRequest.revised_build_artifact_id}`);
      const revisedEvidence = latestRevisionRequest.revised_browser_evidence_id
        ? await repositories.webStudioBrowserQAEvidence.getBrowserEvidenceById({ browser_evidence_id: latestRevisionRequest.revised_browser_evidence_id })
        : null;
      const published = await this.publishPreviewArtifact(order, revisedArtifact, options);
      return {
        revision_request_id: latestRevisionRequest.revision_request_id,
        revision_number: latestRevisionRequest.revision_number,
        selected_variant_id: latestRevisionRequest.selected_variant_id,
        revised_build_artifact_id: revisedArtifact.build_artifact_id,
        revised_browser_evidence_id: revisedEvidence?.browser_evidence_id || latestRevisionRequest.revised_browser_evidence_id || null,
        published_root: published.published_root,
        published_html_path: published.published_html_path,
        published_manifest_path: published.published_manifest_path,
        preview_route_path: published.preview_route_path,
        preview_url: published.preview_url,
        revision_status: latestRevisionRequest.revision_execution_status,
        revised_browser_qa_status: latestRevisionRequest.revised_browser_qa_status || revisedEvidence?.status || null,
      };
    },

    async buildPublicDeliveryBundleForOrder(orderId, options = {}) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id: orderId });
      if (!order) throw new Error(`WebStudio order not found: ${orderId}`);
      const binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id: orderId });
      if (!binding) throw new Error(`TaskFlow binding missing for order: ${orderId}`);
      const existing = await repositories.webStudioPublicDeliveryBundles.getPublicDeliveryBundleByOrderId({ order_id: orderId });
      if (existing) {
        return existing;
      }

      const initialPreviews = await this.buildInitialVariantPreviewEntries(orderId, options);
      const revisedPreview = await this.buildRevisedPreviewEntry(orderId, options);
      const selectedPreview = initialPreviews.find((row) => row.variant_id === order.selected_variant_id) || null;
      const primaryPreview = initialPreviews.find((row) => row.branch_name === 'B') || null;
      const placeholderPreviews = initialPreviews.filter((row) => row.branch_name !== 'B').map((row) => ({
        ...row,
        placeholder_reason: 'Reserved sibling branch for future full multi-variant execution',
      }));
      const latestRevisionRequest = await revisionService.getLatestRevisionRequest(orderId);
      const now = nowIso();
      const bundle = {
        public_delivery_id: buildPublicDeliveryId(orderId),
        order_id: orderId,
        governed_flow_id: binding.governed_flow_id,
        taskflow_id: binding.taskflow_id,
        binding_id: binding.binding_id,
        status: 'ready',
        source: 'bounded_local_preview_publisher',
        hosting_native: false,
        public_base_url: options.publicBaseUrl || null,
        preview_root: path.join(rootDir, 'backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-public-previews', orderId),
        initial_previews: initialPreviews,
        primary_variant: primaryPreview ? {
          variant_id: primaryPreview.variant_id,
          branch_name: primaryPreview.branch_name,
          build_artifact_id: primaryPreview.build_artifact_id,
          preview_path: primaryPreview.published_html_path,
          qa_summary: primaryPreview.qa_status,
          revision_status: revisedPreview?.revision_status || null,
        } : null,
        placeholder_variants: placeholderPreviews,
        selected_variant_id: order.selected_variant_id || null,
        selected_preview: selectedPreview,
        revision_request_id: latestRevisionRequest?.revision_request_id || null,
        revised_preview: revisedPreview,
        qa_summary: buildQaSummary(initialPreviews, revisedPreview),
        limitations: [
          'Bounded local preview publishing only, not production hosting.',
          'Variant B is the only real MVP implementation in this slice; A/C remain placeholders.',
          'preview_url remains null unless a trusted publicBaseUrl is explicitly supplied.',
        ],
        created_at: now,
        updated_at: now,
      };

      return repositories.webStudioPublicDeliveryBundles.createPublicDeliveryBundle({ public_delivery_bundle: bundle });
    },

    async getPublicDeliveryBundle(orderId) {
      return repositories.webStudioPublicDeliveryBundles.getPublicDeliveryBundleByOrderId({ order_id: orderId });
    },

    async getPublicDeliverySurface(orderId) {
      const publicDeliveryBundle = await this.getPublicDeliveryBundle(orderId);
      return {
        public_delivery_bundle: clone(publicDeliveryBundle),
        initial_previews: clone(publicDeliveryBundle?.initial_previews || []),
        selected_preview: clone(publicDeliveryBundle?.selected_preview || null),
        revised_preview: clone(publicDeliveryBundle?.revised_preview || null),
        delivery_status: publicDeliveryBundle?.status || null,
        limitations: clone(publicDeliveryBundle?.limitations || []),
      };
    },
  });
}

module.exports = {
  createWebStudioPublicDeliveryService,
};