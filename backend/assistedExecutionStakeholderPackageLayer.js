const { buildAssistedExecutionPublishingPack } = require('./assistedExecutionPublishingPackLayer');
const { buildAssistedExecutionBundleIndex } = require('./assistedExecutionBundleIndexLayer');
const { buildAssistedExecutionDeliveryBundle } = require('./assistedExecutionDeliveryLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');

function buildAssistedExecutionStakeholderPackage(runtimeState = {}, actorRole = 'orchestrator') {
  const publishingPack = buildAssistedExecutionPublishingPack(runtimeState, actorRole);
  const bundleIndex = buildAssistedExecutionBundleIndex(runtimeState, actorRole);
  const delivery = buildAssistedExecutionDeliveryBundle(runtimeState, actorRole);
  const decision = buildDecisionAssistanceSurface(runtimeState, actorRole);

  return {
    updatedAt: publishingPack.updatedAt || bundleIndex.updatedAt || delivery.updatedAt || null,
    actor_role: actorRole,
    package_kind: 'assisted-execution-stakeholder-package',
    curated_audience_summaries: {
      cto: {
        headline: 'CTO delivery summary',
        recommended_surface: bundleIndex.publishing_map?.cto_primary_surface || 'assisted_execution_delivery',
        suggested_owner: delivery.cto_orchestrator_handoff_summary?.suggested_owner || 'orchestrator',
      },
      orchestrator: {
        headline: 'Orchestrator execution summary',
        recommended_surface: bundleIndex.publishing_map?.orchestrator_primary_surface || 'assisted_execution_presentation',
        suggested_owner: delivery.cto_orchestrator_handoff_summary?.suggested_owner || 'orchestrator',
      },
      stakeholder: {
        headline: 'Stakeholder publishing summary',
        recommended_surface: publishingPack.curated_entry_routing?.recommended_entry || 'assisted_execution_delivery',
        suggested_owner: publishingPack.consumer_handoff_manifest?.suggested_owner || 'orchestrator',
      },
    },
    delivery_slices: {
      executive_slice: {
        entry: 'assisted_execution_delivery',
        artifact: 'docs/artifacts/assisted-execution-delivery.json',
        endpoint: '/api/export/assisted-execution-delivery',
      },
      presentation_slice: {
        entry: 'assisted_execution_presentation',
        endpoint: '/api/export/assisted-execution-presentation',
      },
      publishing_slice: {
        entry: 'assisted_execution_publishing_pack',
        artifact: 'docs/artifacts/assisted-execution-publishing-pack.json',
        endpoint: '/api/export/assisted-execution-publishing-pack',
      },
    },
    recipient_specific_routing: {
      cto_route: 'assisted_execution_delivery',
      orchestrator_route: 'assisted_execution_presentation',
      stakeholder_route: 'assisted_execution_publishing_pack',
      read_only: true,
    },
    stakeholder_summary_payload: {
      recommended_entry: publishingPack.curated_entry_routing?.recommended_entry || 'assisted_execution_delivery',
      top_guidance: publishingPack.distribution_priorities?.top_guidance || [],
      routing_recommendations: (decision.routing_recommendations || []).slice(0, 3).map((item) => item.kind),
      consumer_ready: true,
    },
    audience_surface_pointers: {
      cto: {
        endpoint: '/api/export/assisted-execution-delivery',
        summary: delivery.cto_orchestrator_handoff_summary || {},
      },
      orchestrator: {
        endpoint: '/api/export/assisted-execution-presentation',
        summary: publishingPack.surface_pointers?.presentation?.summary || {},
      },
      stakeholder: {
        endpoint: '/api/export/assisted-execution-publishing-pack',
        artifact: 'docs/artifacts/assisted-execution-publishing-pack.json',
        summary: publishingPack.publishing_payload || {},
      },
      index: {
        endpoint: '/api/export/assisted-execution-bundle-index',
        artifact: 'docs/artifacts/assisted-execution-bundle-index.json',
        summary: bundleIndex.publishing_payload || {},
      },
    },
    stakeholder_delivery_payload: {
      actor_role: actorRole,
      audiences: ['cto', 'orchestrator', 'stakeholder'],
      preferred_routes: {
        cto: 'assisted_execution_delivery',
        orchestrator: 'assisted_execution_presentation',
        stakeholder: 'assisted_execution_publishing_pack',
      },
      compact_distribution_map: [
        'cto -> assisted_execution_delivery',
        'orchestrator -> assisted_execution_presentation',
        'stakeholder -> assisted_execution_publishing_pack',
      ],
    },
  };
}

module.exports = {
  buildAssistedExecutionStakeholderPackage,
};
