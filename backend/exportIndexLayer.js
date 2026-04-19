const path = require('path');
const { buildExecutiveSummary } = require('./executiveSummaryLayer');
const { buildStakeholderHandoffBundle } = require('./stakeholderHandoffLayer');
const { buildDecisionConsumerSurface, buildKnowledgeAwareContext } = require('./knowledgeAwareLayer');
const { buildOperatorSurface } = require('./operatorLayer');
const { buildRuntimeUiView } = require('./uiStateView');

function buildExportIndex(runtimeState = {}, actorRole = 'cto') {
  const tasks = Array.isArray(runtimeState.tasks) ? runtimeState.tasks : [];
  const updatedAt = runtimeState.updatedAt || runtimeState.timestamp || null;
  const executive = buildExecutiveSummary({ updatedAt, tasks }, actorRole);
  const handoff = buildStakeholderHandoffBundle({ updatedAt, tasks }, actorRole);
  const decision = buildDecisionConsumerSurface({ updatedAt, tasks }, actorRole);
  const knowledge = buildKnowledgeAwareContext({ updatedAt, tasks }, actorRole);
  const operator = buildOperatorSurface({ updatedAt, actorRole, tasks });
  const ui = buildRuntimeUiView({ updatedAt, tasks });

  return {
    updatedAt,
    actor_role: actorRole,
    index_kind: 'export-index',
    surfaces: {
      executive_summary: {
        kind: 'executive-summary',
        artifact: 'docs/artifacts/executive-summary.json',
        endpoint: '/api/export/executive-summary',
        summary: executive.executive_payload,
      },
      stakeholder_handoff: {
        kind: 'stakeholder-handoff',
        artifact: 'docs/artifacts/stakeholder-handoff-bundle.json',
        endpoint: '/api/export/stakeholder-handoff',
        summary: handoff.handoff_payload,
      },
      decision_context: {
        kind: 'decision-context',
        artifact: 'docs/artifacts/decision-context.json',
        endpoint: '/api/export/decision-context',
        summary: decision.compact_decision_payload,
      },
      external_reporting: {
        kind: 'external-reporting',
        artifact: 'docs/artifacts/external-reporting-layer.json',
        endpoint: '/api/export/operator-snapshot',
        summary: executive.reporting_export_summary,
      },
      operator_clone_report: {
        kind: 'operator-clone-report',
        artifact: 'docs/artifacts/operator-clone-acceptance-report.json',
        endpoint: null,
        summary: {
          runtime_tasks: ui.tasks.length,
          export_ready: true,
          by_live_state: operator.analytics?.by_live_state || {},
        },
      },
      knowledge_context: {
        kind: 'knowledge-aware-context',
        artifact: 'docs/artifacts/knowledge-aware-context.json',
        endpoint: '/api/export/knowledge-aware-context',
        summary: knowledge.compact_context_payload,
      },
    },
    endpoints: [
      '/api/export/operator-snapshot',
      '/api/export/knowledge-aware-context',
      '/api/export/decision-context',
      '/api/export/executive-summary',
      '/api/export/stakeholder-handoff',
      '/api/export/export-index',
    ],
    artifacts: [
      'docs/artifacts/decision-context.json',
      'docs/artifacts/executive-summary.json',
      'docs/artifacts/external-reporting-layer.json',
      'docs/artifacts/knowledge-aware-context.json',
      'docs/artifacts/operator-clone-acceptance-report.json',
      'docs/artifacts/stakeholder-handoff-bundle.json',
      'docs/artifacts/export-index.json',
    ],
    delivery_payload: {
      actor_role: actorRole,
      available_surfaces: Object.keys({
        executive_summary: true,
        stakeholder_handoff: true,
        decision_context: true,
        external_reporting: true,
        operator_clone_report: true,
        knowledge_context: true,
      }),
      recommended_entry: 'stakeholder_handoff',
      top_endpoints: ['/api/export/stakeholder-handoff', '/api/export/executive-summary', '/api/export/decision-context'],
      top_artifacts: ['docs/artifacts/stakeholder-handoff-bundle.json', 'docs/artifacts/executive-summary.json', 'docs/artifacts/export-index.json'],
    },
  };
}

module.exports = {
  buildExportIndex,
};
