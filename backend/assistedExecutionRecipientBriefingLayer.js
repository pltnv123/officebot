const { buildAssistedExecutionStakeholderPackage } = require('./assistedExecutionStakeholderPackageLayer');
const { buildAssistedExecutionPublishingPack } = require('./assistedExecutionPublishingPackLayer');
const { buildDecisionAssistanceSurface } = require('./decisionAssistanceLayer');

function buildAssistedExecutionRecipientBriefing(runtimeState = {}, actorRole = 'orchestrator') {
  const stakeholderPackage = buildAssistedExecutionStakeholderPackage(runtimeState, actorRole);
  const publishingPack = buildAssistedExecutionPublishingPack(runtimeState, actorRole);
  const decision = buildDecisionAssistanceSurface(runtimeState, actorRole);

  return {
    updatedAt: stakeholderPackage.updatedAt || publishingPack.updatedAt || null,
    actor_role: actorRole,
    briefing_kind: 'assisted-execution-recipient-briefing',
    curated_recipient_briefs: {
      cto: {
        headline: 'CTO briefing',
        recommended_surface: stakeholderPackage.recipient_specific_routing?.cto_route || 'assisted_execution_delivery',
        focus: 'delivery oversight',
      },
      orchestrator: {
        headline: 'Orchestrator briefing',
        recommended_surface: stakeholderPackage.recipient_specific_routing?.orchestrator_route || 'assisted_execution_presentation',
        focus: 'execution routing',
      },
      stakeholder: {
        headline: 'Stakeholder briefing',
        recommended_surface: stakeholderPackage.recipient_specific_routing?.stakeholder_route || 'assisted_execution_publishing_pack',
        focus: 'publishing handoff',
      },
    },
    briefing_priorities: {
      cto: stakeholderPackage.recipient_specific_routing?.cto_route || 'assisted_execution_delivery',
      orchestrator: stakeholderPackage.recipient_specific_routing?.orchestrator_route || 'assisted_execution_presentation',
      stakeholder: stakeholderPackage.recipient_specific_routing?.stakeholder_route || 'assisted_execution_publishing_pack',
      top_recommendations: (decision.routing_recommendations || []).slice(0, 3).map((item) => item.kind),
    },
    per_recipient_consumption_views: {
      cto: {
        summary: stakeholderPackage.curated_audience_summaries?.cto || {},
        endpoint: '/api/export/assisted-execution-delivery',
      },
      orchestrator: {
        summary: stakeholderPackage.curated_audience_summaries?.orchestrator || {},
        endpoint: '/api/export/assisted-execution-presentation',
      },
      stakeholder: {
        summary: stakeholderPackage.curated_audience_summaries?.stakeholder || {},
        endpoint: '/api/export/assisted-execution-publishing-pack',
      },
    },
    recipient_summary_payload: {
      recipient_count: 3,
      recommended_entry: stakeholderPackage.stakeholder_summary_payload?.recommended_entry || 'assisted_execution_delivery',
      top_guidance: stakeholderPackage.stakeholder_summary_payload?.top_guidance || [],
      consumer_ready: true,
    },
    recipient_surface_pointers: {
      cto: stakeholderPackage.audience_surface_pointers?.cto || {},
      orchestrator: stakeholderPackage.audience_surface_pointers?.orchestrator || {},
      stakeholder: stakeholderPackage.audience_surface_pointers?.stakeholder || {},
      index: stakeholderPackage.audience_surface_pointers?.index || {},
    },
    briefing_payload: {
      actor_role: actorRole,
      recipients: ['cto', 'orchestrator', 'stakeholder'],
      preferred_surfaces: {
        cto: stakeholderPackage.recipient_specific_routing?.cto_route || 'assisted_execution_delivery',
        orchestrator: stakeholderPackage.recipient_specific_routing?.orchestrator_route || 'assisted_execution_presentation',
        stakeholder: stakeholderPackage.recipient_specific_routing?.stakeholder_route || 'assisted_execution_publishing_pack',
      },
      compact_views: ['cto', 'orchestrator', 'stakeholder'],
    },
  };
}

module.exports = {
  buildAssistedExecutionRecipientBriefing,
};
