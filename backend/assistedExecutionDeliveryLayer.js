const { buildAssistedExecutionHandoff } = require('./assistedExecutionHandoffLayer');
const { buildAssistedExecutionPresentation } = require('./assistedExecutionPresentationLayer');

function buildAssistedExecutionDeliveryBundle(runtimeState = {}, actorRole = 'orchestrator') {
  const handoff = buildAssistedExecutionHandoff(runtimeState, actorRole);
  const presentation = buildAssistedExecutionPresentation(runtimeState, actorRole);

  return {
    updatedAt: handoff.updatedAt || presentation.updatedAt || null,
    actor_role: actorRole,
    bundle_kind: 'assisted-execution-delivery',
    readiness_outputs: handoff.readiness_outputs || [],
    suggested_next_handoff: handoff.suggested_next_handoff || {},
    execution_handoff_summary: handoff.execution_handoff_summary || {},
    next_action_guidance: handoff.next_action_guidance || {},
    compact_handoff_surface: handoff.compact_handoff_surface || {},
    presentation_payload: presentation.presentation_payload || {},
    cto_orchestrator_handoff_summary: {
      suggested_owner: handoff.suggested_next_handoff?.owner || 'orchestrator',
      handoff_kind: handoff.suggested_next_handoff?.kind || 'normal_routing',
      readiness_ready_total: handoff.compact_handoff_surface?.readiness_ready_total || 0,
      next_actions_total: Array.isArray(handoff.next_action_guidance?.next_actions) ? handoff.next_action_guidance.next_actions.length : 0,
      top_guidance: presentation.presentation_payload?.top_guidance || [],
    },
    delivery_payload: {
      actor_role: actorRole,
      suggested_owner: handoff.suggested_next_handoff?.owner || 'orchestrator',
      readiness_ready_total: handoff.compact_handoff_surface?.readiness_ready_total || 0,
      next_actions_total: Array.isArray(handoff.next_action_guidance?.next_actions) ? handoff.next_action_guidance.next_actions.length : 0,
      presentation_ready: true,
      top_guidance: presentation.presentation_payload?.top_guidance || [],
    },
  };
}

module.exports = {
  buildAssistedExecutionDeliveryBundle,
};
