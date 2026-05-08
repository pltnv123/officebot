# Approval Board v3 Card Schema

Generated: 2026-05-08T10:19:22+00:00

Safe scope: approval reconciliation, docs/templates/reports only. No source, workflow, VPS, Supabase, runtime/log/evidence mutation beyond approved dashboard/report files; no qmd embed/query/vsearch; no secret output.

## Card Classes

- safe-now: report/template/docs/QMD safe-mode work
- approval-needed: source/workflow/package/Supabase/deploy/VPS action requiring exact approval
- blocked-by-owner: assets/legal/CRM/credentials/materials missing
- forbidden-without-explicit-approval: destructive, direct main, force push, DB write, systemctl/SSH mutation, qmd embed/query/vsearch, secret output

## Card Fields

approval_id, class, requested_action, exact_scope, allowed_files, forbidden_files, commands, rollback_plan, verification_plan, expires_at, owner_decision

## Prompt Snippets

- Approve docs-only PR? Scope: allowed docs paths only; verify file list/checks.
- Approve read-only VPS preflight? Scope: status/log metadata only; no restart/enable/install.
- Approve Supabase migration apply? Scope: specific SQL file only after proposal review; include rollback and verification.
- Approve source/workflow change? Scope: named files/branch/checks only; no unrelated changes.
