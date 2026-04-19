const { buildExportIndex } = require('./exportIndexLayer');
const { buildExecutiveSummary } = require('./executiveSummaryLayer');
const { buildStakeholderHandoffBundle } = require('./stakeholderHandoffLayer');
const { buildDecisionConsumerSurface } = require('./knowledgeAwareLayer');

function buildDeliveryPack(runtimeState = {}, actorRole = 'cto') {
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const exportIndex = buildExportIndex({ updatedAt, tasks }, actorRole);
  const executive = buildExecutiveSummary({ updatedAt, tasks }, actorRole);
  const handoff = buildStakeholderHandoffBundle({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionConsumerSurface({ updatedAt, tasks }, actorRole);

  return {
    updatedAt,
    actor_role: actorRole,
    pack_kind: 'delivery-pack',
    landing_report: {
      headline: 'Curated stakeholder delivery pack',
      subhead: 'Single read-only handoff surface for executive review, routing context, and export navigation.',
      recommended_entry: exportIndex.delivery_payload?.recommended_entry || 'stakeholder_handoff',
      surfaces_ready: exportIndex.delivery_payload?.available_surfaces || [],
    },
    distribution_manifest: {
      recommended_path: [
        '/api/export/stakeholder-handoff',
        '/api/export/executive-summary',
        '/api/export/export-index',
      ],
      artifacts: exportIndex.artifacts || [],
      endpoints: exportIndex.endpoints || [],
    },
    human_handoff_summary: {
      executive_brief: executive.decision_context_summary?.brief || '',
      stakeholder_focus: handoff.handoff_payload?.routing_focus || 'normal_flow',
      suggested_owner: handoff.handoff_payload?.suggested_owner || 'orchestrator',
      top_recommendations: handoff.handoff_payload?.top_recommendations || [],
    },
    links_and_pointers: {
      executive_summary: {
        artifact: 'docs/artifacts/executive-summary.json',
        endpoint: '/api/export/executive-summary',
      },
      stakeholder_handoff: {
        artifact: 'docs/artifacts/stakeholder-handoff-bundle.json',
        endpoint: '/api/export/stakeholder-handoff',
      },
      decision_context: {
        artifact: 'docs/artifacts/decision-context.json',
        endpoint: '/api/export/decision-context',
      },
      reporting_exports: {
        artifact: 'docs/artifacts/external-reporting-layer.json',
        endpoint: '/api/export/operator-snapshot',
      },
      export_index: {
        artifact: 'docs/artifacts/export-index.json',
        endpoint: '/api/export/export-index',
      },
    },
    machine_readable_manifest: {
      pack_kind: 'delivery-pack',
      available_surfaces: exportIndex.delivery_payload?.available_surfaces || [],
      top_endpoints: exportIndex.delivery_payload?.top_endpoints || [],
      top_artifacts: exportIndex.delivery_payload?.top_artifacts || [],
      suggested_owner: decision.suggested_owner || 'orchestrator',
    },
  };
}

module.exports = {
  buildDeliveryPack,
};
