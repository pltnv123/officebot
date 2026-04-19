const { buildAssistedExecutionHandoff } = require('./assistedExecutionHandoffLayer');

function buildAssistedExecutionPresentation(runtimeState = {}, actorRole = 'orchestrator') {
  const handoff = buildAssistedExecutionHandoff(runtimeState, actorRole);
  return {
    updatedAt: handoff.updatedAt || null,
    actor_role: actorRole,
    presentation_kind: 'assisted-execution-presentation',
    readiness_outputs: handoff.readiness_outputs || [],
    suggested_next_handoff: handoff.suggested_next_handoff || {},
    execution_handoff_summary: handoff.execution_handoff_summary || {},
    next_action_guidance: handoff.next_action_guidance || {},
    compact_handoff_surface: handoff.compact_handoff_surface || {},
    presentation_payload: {
      suggested_owner: handoff.suggested_next_handoff?.owner || 'orchestrator',
      handoff_kind: handoff.suggested_next_handoff?.kind || 'normal_routing',
      readiness_ready_total: handoff.compact_handoff_surface?.readiness_ready_total || 0,
      next_actions_total: Array.isArray(handoff.next_action_guidance?.next_actions) ? handoff.next_action_guidance.next_actions.length : 0,
      top_guidance: Array.isArray(handoff.next_action_guidance?.next_actions)
        ? handoff.next_action_guidance.next_actions.slice(0, 3).map((item) => item.kind)
        : [],
    },
  };
}

module.exports = {
  buildAssistedExecutionPresentation,
};
