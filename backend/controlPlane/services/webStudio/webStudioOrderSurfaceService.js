function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sortVariants(rows = []) {
  return [...rows].sort((a, b) => String(a.branch_name).localeCompare(String(b.branch_name)));
}

function createWebStudioOrderSurfaceService({ repositories } = {}) {
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioQAResults || !repositories.webStudioDeliveryBundles || !repositories.webStudioTaskFlowBindings || !repositories.webStudioChildSessions || !repositories.webStudioBrowserQAEvidence || !repositories.webStudioBuildArtifacts || !repositories.webStudioRevisionRequests) {
    throw new Error('webStudioOrderSurfaceService requires webStudio repositories');
  }

  return Object.freeze({
    async buildOrderSurface({ order_id }) {
      const order = await repositories.webStudioOrders.getOrderById({ order_id });
      if (!order) {
        return null;
      }

      const variants = sortVariants(await repositories.webStudioVariants.listVariantsByOrderId({ order_id }));
      const qa_results = await repositories.webStudioQAResults.listQAResultsByOrderId({ order_id });
      const delivery_bundle = await repositories.webStudioDeliveryBundles.getLatestDeliveryBundleByOrderId({ order_id });
      const taskflow_binding = await repositories.webStudioTaskFlowBindings.getBindingByOrderId({ order_id });
      const child_sessions = await repositories.webStudioChildSessions.listChildSessionsByOrderId({ order_id });
      const browser_qa_evidence = await repositories.webStudioBrowserQAEvidence.listBrowserEvidenceByOrderId({ order_id });
      const build_artifacts = await repositories.webStudioBuildArtifacts.listBuildArtifactsByOrderId({ order_id });
      const revision_requests = await repositories.webStudioRevisionRequests.listRevisionRequestsByOrderId({ order_id });
      const childSessionsByVariantId = new Map(child_sessions.map((row) => [row.variant_id, row]));
      const initialBrowserEvidence = browser_qa_evidence.filter((row) => (row.evidence_scope || 'initial') !== 'revision');
      const revisedBrowserEvidence = browser_qa_evidence.filter((row) => row.evidence_scope === 'revision');
      const browserEvidenceByVariantId = new Map(initialBrowserEvidence.map((row) => [row.variant_id, row]));
      const latestRevisedBrowserEvidenceByVariantId = new Map();
      for (const evidence of revisedBrowserEvidence.sort((a, b) => Number(a.revision_number || 0) - Number(b.revision_number || 0))) {
        latestRevisedBrowserEvidenceByVariantId.set(evidence.variant_id, evidence);
      }
      const initialBuildArtifacts = build_artifacts.filter((row) => (row.artifact_type || 'initial') !== 'revision');
      const revisedBuildArtifacts = build_artifacts.filter((row) => row.artifact_type === 'revision');
      const buildArtifactsByVariantId = new Map(initialBuildArtifacts.map((row) => [row.variant_id, row]));
      const latestRevisedArtifactByVariantId = new Map();
      for (const artifact of revisedBuildArtifacts.sort((a, b) => Number(a.revision_number || 0) - Number(b.revision_number || 0))) {
        latestRevisedArtifactByVariantId.set(artifact.variant_id, artifact);
      }
      const qaByVariantId = new Map(qa_results.map((row) => [row.variant_id, row]));

      const selectedVariantId = order.selected_variant_id || taskflow_binding?.selected_variant_id || delivery_bundle?.selected_variant_id || null;
      const selectedVariant = selectedVariantId ? variants.find((row) => row.variant_id === selectedVariantId) || null : null;
      const latestRevisionRequest = [...revision_requests].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;

      return Object.freeze({
        surface_kind: 'webstudio_order_surface',
        source: 'real_persisted_records',
        generated_at: nowIso(),
        order: clone(order),
        normalized_brief: clone(order.normalized_brief || null),
        governed_flow_id: order.governed_flow_id || null,
        taskflow_id: order.taskflow_id || null,
        variants: variants.map((variant) => {
          const childSession = childSessionsByVariantId.get(variant.variant_id) || null;
          const browserEvidence = browserEvidenceByVariantId.get(variant.variant_id) || null;
          const buildArtifact = buildArtifactsByVariantId.get(variant.variant_id) || null;
          const revisedBuildArtifact = latestRevisedArtifactByVariantId.get(variant.variant_id) || null;
          const revisedBrowserQaEvidence = latestRevisedBrowserEvidenceByVariantId.get(variant.variant_id) || null;
          return Object.freeze({
            ...clone(variant),
            qa_result: clone(qaByVariantId.get(variant.variant_id) || null),
            child_session_id: childSession?.child_session_id || variant.child_session_id || null,
            child_agent_id: childSession?.child_agent_id || variant.child_agent_id || null,
            child_workspace_key: childSession?.child_workspace_key || variant.child_workspace_key || null,
            child_execution_status: childSession?.status || variant.child_execution_status || null,
            browser_evidence_id: browserEvidence?.browser_evidence_id || variant.browser_evidence_id || null,
            browser_qa_status: browserEvidence?.status || variant.browser_qa_status || null,
            browser_native: browserEvidence?.browser_native || variant.browser_native || false,
            screenshot_path: browserEvidence?.screenshot_path || variant.screenshot_path || null,
            snapshot_path: browserEvidence?.snapshot_path || variant.snapshot_path || null,
            trace_path: browserEvidence?.trace_path || variant.trace_path || null,
            capture_status: browserEvidence?.capture_status || variant.capture_status || null,
            capture_provider: browserEvidence?.capture_provider || variant.capture_provider || null,
            capture_capability: clone(browserEvidence?.capture_capability || variant.capture_capability || null),
            build_artifact_id: buildArtifact?.build_artifact_id || variant.build_artifact_id || null,
            build_status: buildArtifact?.status || variant.build_status || null,
            artifact_root: buildArtifact?.artifact_root || variant.artifact_root || null,
            html_path: buildArtifact?.html_path || variant.html_path || null,
            manifest_path: buildArtifact?.manifest_path || variant.manifest_path || null,
            preview_path: buildArtifact?.preview_path || variant.preview_path || null,
            revised_build_artifact_id: revisedBuildArtifact?.build_artifact_id || null,
            revision_status: revisedBuildArtifact ? 'completed' : null,
            revised_html_path: revisedBuildArtifact?.html_path || null,
            revised_manifest_path: revisedBuildArtifact?.manifest_path || null,
            revised_preview_path: revisedBuildArtifact?.preview_path || null,
            revised_browser_evidence_id: revisedBrowserQaEvidence?.browser_evidence_id || null,
            revised_browser_qa_status: revisedBrowserQaEvidence?.status || null,
            revised_capture_status: revisedBrowserQaEvidence?.capture_status || null,
            revised_browser_native: revisedBrowserQaEvidence?.browser_native || false,
            revised_screenshot_path: revisedBrowserQaEvidence?.screenshot_path || null,
            revised_snapshot_path: revisedBrowserQaEvidence?.snapshot_path || null,
          });
        }),
        selected_variant_id: selectedVariantId,
        selected_variant: selectedVariant ? Object.freeze({
          ...clone(selectedVariant),
          child_session_id: childSessionsByVariantId.get(selectedVariant.variant_id)?.child_session_id || selectedVariant.child_session_id || null,
          build_artifact_id: buildArtifactsByVariantId.get(selectedVariant.variant_id)?.build_artifact_id || selectedVariant.build_artifact_id || null,
          browser_evidence_id: browserEvidenceByVariantId.get(selectedVariant.variant_id)?.browser_evidence_id || selectedVariant.browser_evidence_id || null,
          preview_path: buildArtifactsByVariantId.get(selectedVariant.variant_id)?.preview_path || selectedVariant.preview_path || null,
          html_path: buildArtifactsByVariantId.get(selectedVariant.variant_id)?.html_path || selectedVariant.html_path || null,
          revised_build_artifact_id: latestRevisedArtifactByVariantId.get(selectedVariant.variant_id)?.build_artifact_id || null,
          revised_html_path: latestRevisedArtifactByVariantId.get(selectedVariant.variant_id)?.html_path || null,
          revised_manifest_path: latestRevisedArtifactByVariantId.get(selectedVariant.variant_id)?.manifest_path || null,
          revision_status: latestRevisedArtifactByVariantId.get(selectedVariant.variant_id) ? 'completed' : null,
          revised_browser_evidence_id: latestRevisedBrowserEvidenceByVariantId.get(selectedVariant.variant_id)?.browser_evidence_id || null,
          revised_browser_qa_status: latestRevisedBrowserEvidenceByVariantId.get(selectedVariant.variant_id)?.status || null,
        }) : null,
        revision_requests: [...revision_requests]
          .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
          .map((row) => clone(row)),
        latest_revision_request: clone(latestRevisionRequest),
        revision_lane: {
          status: latestRevisionRequest?.revision_lane_status || (selectedVariantId ? 'ready' : 'not_created'),
          selected_variant_id: selectedVariantId,
          revision_request_id: latestRevisionRequest?.revision_request_id || null,
          pending_execution: ['ready', 'pending_execution'].includes(latestRevisionRequest?.revision_lane_status || ''),
          completed: (latestRevisionRequest?.revision_lane_status || '') === 'completed',
          revised_build_artifact_id: latestRevisionRequest?.revised_build_artifact_id || null,
          revised_browser_evidence_id: latestRevisionRequest?.revised_browser_evidence_id || null,
          revised_browser_qa_status: latestRevisionRequest?.revised_browser_qa_status || null,
          revised_capture_status: latestRevisionRequest?.revised_capture_status || null,
          browser_reqa_completed: Boolean(latestRevisionRequest?.revised_browser_evidence_id),
          next_action: latestRevisionRequest
            ? (latestRevisionRequest?.revised_browser_evidence_id
              ? 'revision_browser_qa_completed'
              : ((latestRevisionRequest?.revision_lane_status || '') === 'completed' ? 'run_revision_browser_qa' : 'execute_selected_variant_revision'))
            : (selectedVariantId ? 'create_revision_request' : 'select_variant'),
        },
        qa_results: qa_results.map((row) => clone(row)),
        delivery_bundle: clone(delivery_bundle),
        taskflow_binding: clone(taskflow_binding),
        child_sessions: child_sessions.map((row) => clone(row)),
        browser_qa_evidence: initialBrowserEvidence.map((row) => clone(row)),
        revised_browser_qa_evidence: revisedBrowserEvidence
          .sort((a, b) => Number(a.revision_number || 0) - Number(b.revision_number || 0))
          .map((row) => clone(row)),
        build_artifacts: initialBuildArtifacts.map((row) => clone(row)),
        revised_build_artifacts: revisedBuildArtifacts
          .sort((a, b) => Number(a.revision_number || 0) - Number(b.revision_number || 0))
          .map((row) => clone(row)),
      });
    },
  });
}

module.exports = {
  createWebStudioOrderSurfaceService,
};
