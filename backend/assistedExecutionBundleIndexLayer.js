const { buildAssistedExecutionHandoff } = require('./assistedExecutionHandoffLayer');
const { buildAssistedExecutionPresentation } = require('./assistedExecutionPresentationLayer');
const { buildAssistedExecutionDeliveryBundle } = require('./assistedExecutionDeliveryLayer');

function buildAssistedExecutionBundleIndex(runtimeState = {}, actorRole = 'orchestrator') {
  const handoff = buildAssistedExecutionHandoff(runtimeState, actorRole);
  const presentation = buildAssistedExecutionPresentation(runtimeState, actorRole);
  const delivery = buildAssistedExecutionDeliveryBundle(runtimeState, actorRole);

  return {
    updatedAt: delivery.updatedAt || handoff.updatedAt || presentation.updatedAt || null,
    actor_role: actorRole,
    index_kind: 'assisted-execution-bundle-index',
    surfaces: {
      assisted_execution_handoff: {
        kind: 'assisted-execution-handoff',
        endpoint: '/api/export/assisted-execution-handoff',
        summary: {
          suggested_owner: handoff.suggested_next_handoff?.owner || 'orchestrator',
          handoff_kind: handoff.suggested_next_handoff?.kind || 'normal_routing',
          readiness_ready_total: handoff.compact_handoff_surface?.readiness_ready_total || 0,
        },
      },
      assisted_execution_presentation: {
        kind: 'assisted-execution-presentation',
        endpoint: '/api/export/assisted-execution-presentation',
        summary: {
          suggested_owner: presentation.presentation_payload?.suggested_owner || 'orchestrator',
          handoff_kind: presentation.presentation_payload?.handoff_kind || 'normal_routing',
          next_actions_total: presentation.presentation_payload?.next_actions_total || 0,
        },
      },
      assisted_execution_delivery: {
        kind: 'assisted-execution-delivery',
        endpoint: '/api/export/assisted-execution-delivery',
        artifact: 'docs/artifacts/assisted-execution-delivery.json',
        summary: delivery.cto_orchestrator_handoff_summary || {},
      },
    },
    publishing_map: {
      recommended_entry: 'assisted_execution_delivery',
      cto_primary_surface: 'assisted_execution_delivery',
      orchestrator_primary_surface: 'assisted_execution_presentation',
      read_only: true,
      snapshot_safe: delivery.compact_handoff_surface?.snapshot_safe || { reconnect_safe: true, backfill_safe: true },
    },
    artifacts: [
      'docs/artifacts/assisted-execution-delivery.json',
    ],
    endpoints: [
      '/api/export/assisted-execution-handoff',
      '/api/export/assisted-execution-presentation',
      '/api/export/assisted-execution-delivery',
      '/api/export/assisted-execution-bundle-index',
    ],
    publishing_payload: {
      actor_role: actorRole,
      available_surfaces: ['assisted_execution_handoff', 'assisted_execution_presentation', 'assisted_execution_delivery'],
      recommended_entry: 'assisted_execution_delivery',
      top_endpoints: ['/api/export/assisted-execution-delivery', '/api/export/assisted-execution-presentation'],
      distribution_map: ['cto -> assisted_execution_delivery', 'orchestrator -> assisted_execution_presentation'],
    },
  };
}

module.exports = {
  buildAssistedExecutionBundleIndex,
};
