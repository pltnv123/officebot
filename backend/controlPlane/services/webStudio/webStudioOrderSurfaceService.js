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
  if (!repositories || !repositories.webStudioOrders || !repositories.webStudioVariants || !repositories.webStudioQAResults || !repositories.webStudioDeliveryBundles || !repositories.webStudioTaskFlowBindings) {
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
      const qaByVariantId = new Map(qa_results.map((row) => [row.variant_id, row]));

      return Object.freeze({
        surface_kind: 'webstudio_order_surface',
        source: 'real_persisted_records',
        generated_at: nowIso(),
        order: clone(order),
        normalized_brief: clone(order.normalized_brief || null),
        governed_flow_id: order.governed_flow_id || null,
        taskflow_id: order.taskflow_id || null,
        variants: variants.map((variant) => Object.freeze({
          ...clone(variant),
          qa_result: clone(qaByVariantId.get(variant.variant_id) || null),
        })),
        qa_results: qa_results.map((row) => clone(row)),
        delivery_bundle: clone(delivery_bundle),
        taskflow_binding: clone(taskflow_binding),
      });
    },
  });
}

module.exports = {
  createWebStudioOrderSurfaceService,
};
