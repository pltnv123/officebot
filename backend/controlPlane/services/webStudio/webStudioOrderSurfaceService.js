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
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioQAResults || !repositories.webStudioDeliveryBundles || !repositories.webStudioTaskFlowBindings || !repositories.webStudioChildSessions || !repositories.webStudioBrowserQAEvidence || !repositories.webStudioBuildArtifacts) {
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
      const childSessionsByVariantId = new Map(child_sessions.map((row) => [row.variant_id, row]));
      const browserEvidenceByVariantId = new Map(browser_qa_evidence.map((row) => [row.variant_id, row]));
      const buildArtifactsByVariantId = new Map(build_artifacts.map((row) => [row.variant_id, row]));
      const qaByVariantId = new Map(qa_results.map((row) => [row.variant_id, row]));

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
            build_artifact_id: buildArtifact?.build_artifact_id || variant.build_artifact_id || null,
            build_status: buildArtifact?.status || variant.build_status || null,
            artifact_root: buildArtifact?.artifact_root || variant.artifact_root || null,
            html_path: buildArtifact?.html_path || variant.html_path || null,
            manifest_path: buildArtifact?.manifest_path || variant.manifest_path || null,
            preview_path: buildArtifact?.preview_path || variant.preview_path || null,
          });
        }),
        qa_results: qa_results.map((row) => clone(row)),
        delivery_bundle: clone(delivery_bundle),
        taskflow_binding: clone(taskflow_binding),
        child_sessions: child_sessions.map((row) => clone(row)),
        browser_qa_evidence: browser_qa_evidence.map((row) => clone(row)),
        build_artifacts: build_artifacts.map((row) => clone(row)),
      });
    },
  });
}

module.exports = {
  createWebStudioOrderSurfaceService,
};
