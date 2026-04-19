# Operator Playbooks

Short actionable runbooks for the current operator system.

## 1. Approval flow
When to use:
- task is visible in operator card
- approval action is available
- evidence/artifacts are sufficient for review

Steps:
1. Open the operator card.
2. Review `audit_digest`, timeline, and recommendations.
3. If the action is executable for your role, run `approve_task`.
4. Wait for snapshot-safe reread or websocket hydrate update.
5. Confirm the approval result in the card feedback.

Notes:
- In read-only mode, approval may be hidden or view-only.
- Final governance ownership remains with orchestrator.

## 2. Reject flow
When to use:
- task evidence is insufficient or unacceptable
- reject action is visible and policy allows review

Steps:
1. Open the operator card.
2. Review `audit_digest`, timeline, and visible evidence summary.
3. Trigger `reject_task`.
4. Confirm the soft confirmation step.
5. Wait for snapshot-safe reread.
6. Verify task feedback shows rejection result.

Notes:
- Reject is a confirmable action.
- In non-orchestrator roles it may be hidden or view-only.

## 3. Requeue flow
When to use:
- execution should be retried
- task is in retry-like or recoverable state

Steps:
1. Open the operator card.
2. Check recommendations and operator warnings.
3. Trigger `requeue_task` if executable.
4. Wait for reread/hydrate update.
5. Verify task returns to queued client state for safe reread.
6. Confirm retry-specific pending maintenance is cleared for that task.

Notes:
- QA may see requeue as view-only depending on current role policy.
- Requeue does not transfer governance ownership away from orchestrator.
- Current accepted semantics: `status=pending`, `assignment_state=queued`, client/UI `live_state=queued`.

## 4. Escalate flow
When to use:
- retry path is no longer enough
- task needs manual governance attention

Steps:
1. Open the operator card.
2. Review recommendations, timeline, and warning chips.
3. Trigger `escalate_task`.
4. Confirm the soft confirmation step.
5. Wait for reread/hydrate update.
6. Verify `assignment_state` becomes `escalated`.

Notes:
- Escalate is confirmable.
- Current acceptance baseline confirms `escalate_task` reaches `assignment_state = escalated`.

## 5. Lock conflict handling
When to use:
- operator card or hints show lock conflict
- lock resolution action is visible

Steps:
1. Open the operator card.
2. Confirm lock conflict from hints or task state.
3. Trigger `resolve_lock_conflict`.
4. Wait for reread/hydrate update.
5. Verify lock conflict is cleared.

Notes:
- Lock conflict resolution is governance-owned.
- Visible but non-executable actions remain view-only for non-authorized roles.

## 6. Stale runtime handling
When to use:
- observability strip shows `warning: stale-runtime`
- freshness age exceeds expected threshold

Steps:
1. Check `storage`, `freshness`, and `task_event` chips.
2. Confirm whether websocket is disconnected or polling-only.
3. If polling is still active, wait for next safe snapshot reread.
4. If stale persists, inspect runtime/backend health before taking governance action.
5. Prefer diagnostics before workflow mutation.

Notes:
- Websocket is only a read-only enhancement.
- Snapshot polling remains the safety path and source-of-truth reread mechanism.
- Readiness checks should confirm both reread safety and hydrate alignment, not hydrate alone.

## 7. Read-only mode explanation
What it means:
- your role can inspect operator cards and policy hints
- some actions may be hidden entirely
- some actions may be visible but non-executable (`view-only`)

How to use it:
1. Read the actor role badge and mode badge.
2. Use visible operator cards, timeline, audit digest, and warnings for review.
3. Treat `view-only` actions as informational unless your role is allowed to execute them.
4. Escalate to orchestrator when governance action is required.

Notes:
- Current policy keeps execution ownership with orchestrator.
- Read-only mode does not weaken control-plane guarantees.
