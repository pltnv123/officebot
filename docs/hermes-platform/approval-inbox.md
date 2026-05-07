# Approval Inbox Protocol

**Version:** 2.0
**Date:** 2026-05-07

## Overview

The approval inbox provides human-in-the-loop gating for autonomous operations requiring oversight.

## Directory Structure

```
/workspace/autonomy/approvals/
├── pending/      # Awaiting review
├── approved/     # Approved, ready for execution
├── rejected/     # Rejected with reason
└── templates/    # Approval request templates
```

## Approval Request Schema

```yaml
approval_request:
  id: string              # Unique ID
  created_at: timestamp
  requested_by: string    # Runner/agent ID
  task_id: string         # Reference to backlog task
  risk_level: enum        # low|medium|high|critical
  requested_action: string
  allowed_files: list
  forbidden_files: list
  commands_requested: list
  github_scope: string
  rollback_plan: string
  verification_plan: string
  approval_prompt: string
  status: enum            # pending|approved|rejected
  approved_at: timestamp|null
  approved_by: string|null
  rejection_reason: string|null
```

## When Approval is Required

**Automatic triggers:**
- `requires_approval: true` in task definition
- `risk_level: high` or `critical`
- `execution_mode: script_only` or `agent_prompt`
- Source code changes (non-docs)
- Workflow modifications
- Database changes

**Autonomous (no approval):**
- `docs_only_pr` with low risk
- `read_only_audit` tasks
- `report_only` tasks
- `approval_request` creation

## Workflow

### 1. Request Creation

hautonomy creates approval request when:
- Task has `requires_approval: true`
- Execution mode requires approval
- Risk level exceeds autonomous threshold

Request saved to: `/workspace/autonomy/approvals/pending/<id>.yaml`

### 2. Human Review

```bash
# List pending approvals
happrovals list

# Review specific request
cat /workspace/autonomy/approvals/pending/<id>.yaml
```

### 3. Decision

**Approve:**
```bash
mv /workspace/autonomy/approvals/pending/<id>.yaml \
   /workspace/autonomy/approvals/approved/
```

**Reject:**
```bash
# Add rejection reason to YAML, then:
mv /workspace/autonomy/approvals/pending/<id>.yaml \
   /workspace/autonomy/approvals/rejected/
```

### 4. Execution

hautonomy processes approved requests on next run:
- Moves task to `in_progress`
- Executes approved actions
- Updates task status on completion

## Commands

```bash
# List pending
happrovals list

# List approved
happrovals approved

# List rejected
happrovals rejected

# Help
happrovals --help
```

## CLI Output Example

```
=== Pending Approvals ===

[1] ID: approval-20260507-001
    Task: supabase-migration-workflow-021
    Risk: high
    Action: Create migration workflow proposal
    Created: 2026-05-07T16:00:00Z
    File: /workspace/autonomy/approvals/pending/approval-20260507-001.yaml

Total: 1 pending
```

## Safety Rules

1. **Never auto-approve high-risk tasks** - Human review required
2. **Verify allowed_files scope** - Ensure no forbidden paths
3. **Check rollback_plan** - Must have recovery strategy
4. **Confirm verification_plan** - Must have success criteria
5. **Review github_scope** - Ensure docs-only if autonomous merge

## Files

- **Template:** `/workspace/autonomy/approvals/templates/approval-request-template.yaml`
- **CLI:** `/workspace/bin/happrovals`
