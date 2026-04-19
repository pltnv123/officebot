const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');
const { buildAssistedExecutionHandoff } = require('./assistedExecutionHandoffLayer');
const { buildAssistedExecutionPresentation } = require('./assistedExecutionPresentationLayer');
const { buildAssistedExecutionDeliveryBundle } = require('./assistedExecutionDeliveryLayer');
const { buildAssistedExecutionBundleIndex } = require('./assistedExecutionBundleIndexLayer');

function buildAssistedExecutionPublishingPack(runtimeState = {}, actorRole = 'orchestrator') {
  const decision = buildDecisionAssistanceSurface(runtimeState, actorRole);
  const handoff = buildAssistedExecutionHandoff(runtimeState, actorRole);
  const presentation = buildAssistedExecutionPresentation(runtimeState, actorRole);
  const delivery = buildAssistedExecutionDeliveryBundle(runtimeState, actorRole);
  const index = buildAssistedExecutionBundleIndex(runtimeState, actorRole);

  return {
    updatedAt: index.updatedAt || delivery.updatedAt || handoff.updatedAt || null,
    actor_role: actorRole,
    pack_kind: 'assisted-execution-publishing-pack',
    consumer_handoff_manifest: {
      headline: 'Assisted execution publishing pack',
      subhead: 'Single read-only publishing and delivery surface for CTO and orchestrator consumption.',
      suggested_owner: delivery.cto_orchestrator_handoff_summary?.suggested_owner || handoff.suggested_next_handoff?.owner || 'orchestrator',
      recommended_entry: index.publishing_map?.recommended_entry || 'assisted_execution_delivery',
      pack_ready: true,
    },
    distribution_priorities: {
      cto_priority: index.publishing_map?.cto_primary_surface || 'assisted_execution_delivery',
      orchestrator_priority: index.publishing_map?.orchestrator_primary_surface || 'assisted_execution_presentation',
      top_guidance: presentation.presentation_payload?.top_guidance || [],
      routing_recommendations: (decision.routing_recommendations || []).slice(0, 3).map((item) => ({
        owner: item.owner,
        kind: item.kind,
        priority: item.priority,
      })),
    },
    curated_entry_routing: {
      recommended_entry: index.publishing_map?.recommended_entry || 'assisted_execution_delivery',
      entry_reason: 'consumer_ready_delivery_surface',
      cto_route: 'assisted_execution_delivery',
      orchestrator_route: 'assisted_execution_presentation',
      read_only: true,
    },
    surface_pointers: {
      handoff: {
        endpoint: '/api/export/assisted-execution-handoff',
        summary: handoff.compact_handoff_surface || {},
      },
      presentation: {
        endpoint: '/api/export/assisted-execution-presentation',
        summary: presentation.presentation_payload || {},
      },
      delivery: {
        endpoint: '/api/export/assisted-execution-delivery',
        artifact: 'docs/artifacts/assisted-execution-delivery.json',
        summary: delivery.delivery_payload || {},
      },
      index: {
        endpoint: '/api/export/assisted-execution-bundle-index',
        artifact: 'docs/artifacts/assisted-execution-bundle-index.json',
        summary: index.publishing_payload || {},
      },
    },
    cto_orchestrator_consumption_summary: {
      suggested_owner: delivery.cto_orchestrator_handoff_summary?.suggested_owner || 'orchestrator',
      handoff_kind: delivery.cto_orchestrator_handoff_summary?.handoff_kind || 'normal_routing',
      readiness_ready_total: delivery.cto_orchestrator_handoff_summary?.readiness_ready_total || 0,
      next_actions_total: delivery.cto_orchestrator_handoff_summary?.next_actions_total || 0,
      recommended_entry: index.publishing_map?.recommended_entry || 'assisted_execution_delivery',
    },
    publishing_payload: {
      actor_role: actorRole,
      top_entry: index.publishing_map?.recommended_entry || 'assisted_execution_delivery',
      consumer_ready: true,
      available_surfaces: ['handoff', 'presentation', 'delivery', 'index'],
      distribution_map: [
        'cto -> assisted_execution_delivery',
        'orchestrator -> assisted_execution_presentation',
      ],
    },
  };
}

module.exports = {
  buildAssistedExecutionPublishingPack,
};
