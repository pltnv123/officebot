# Supabase Autonomy Control Plane Proposal

Status: proposal only; no SQL executed.

## Proposed tables
- autonomy_tasks
- autonomy_runs
- autonomy_artifacts
- approval_requests
- risk_register
- finalizer_events
- snapshot_events
- github_pr_events
- agent_reviews
- metrics_daily

## Data rule
Sanitized summaries and artifact paths only. No raw prompts, logs, secrets, tokens, or credential material.
