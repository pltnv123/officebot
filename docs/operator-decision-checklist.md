# Operator Decision Checklist

Compact checklist for real operator workflow rehearsal and review.

## Before acting
- Open the operator card.
- Read `audit_digest`, timeline, and top recommendations.
- Confirm the action is executable for the current actor role.
- Prefer snapshot-safe reread as the source of truth.

## By branch
### Approval
- Evidence/artifacts are sufficient.
- After action, `approval_pending` should clear.
- Export and client surface should stay aligned.

### Reject
- Evidence is insufficient or unacceptable.
- Confirm rejection result appears in operator feedback/timeline.
- Role policy must still be respected.

### Requeue
- Task is retry-like and recoverable.
- After action: `status=pending`, `assignment_state=queued`, client/UI `live_state=queued`.
- Retry-specific maintenance followup should drop from top pending items for that task.

### Escalate
- Retry path is no longer enough.
- After action, `assignment_state=escalated`.
- Analytics should reflect escalated branch.

### Lock conflict
- Lock conflict is visible in hints/card state.
- After action, `lock_conflict=false`.
- Conflict counters should clear on reread.

## Alignment checks after action
- Analytics summary matches the branch result.
- Export summary matches the client live state.
- Role-aware client surface still reflects policy visibility/executability.
- Snapshot-safe reread flags remain true.
- Websocket hydrate remains additive read-only enhancement only.
