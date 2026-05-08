# Website QA v3 Verdict Schema

Generated: 2026-05-08T10:19:22+00:00

Safe scope: approval reconciliation, docs/templates/reports only. No source, workflow, VPS, Supabase, runtime/log/evidence mutation beyond approved dashboard/report files; no qmd embed/query/vsearch; no secret output.

## Verdict Classes

- blocker: cannot ship until resolved
- ship-with-caveat: can ship only with named caveat and owner acceptance
- follow-up: non-blocking post-ship task
- client-owned dependency: waiting on assets/legal/booking/CRM/content from client
- evidence_path: screenshot/report/log path, redacted when necessary
- release_recommendation: ship | ship_with_caveat | hold | needs_owner_decision

## Minimum Evidence Row

scenario, check_id, verdict_class, owner, evidence_path, release_recommendation, next_action

## Stop Conditions

Legal/medical/financial overclaims, broken primary CTA, missing privacy-sensitive dependency, or unapproved deploy/source/runtime action.
