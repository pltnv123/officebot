# Template Factory v3 Fields

Generated: 2026-05-08T10:19:22+00:00

Safe scope: approval reconciliation, docs/templates/reports only. No source, workflow, VPS, Supabase, runtime/log/evidence mutation beyond approved dashboard/report files; no qmd embed/query/vsearch; no secret output.

## Required Fields

- industry_risk: low | medium | regulated | medical | financial | data_sensitive
- proof_type: testimonial | credential | case_study | process | third_party | none
- forbidden_claims: explicit list of claims the template must not make
- dependency_owner: client | owner | legal | designer | developer | unknown
- acceptance_threshold: PASS | PARTIAL_ALLOWED | BLOCKED_UNTIL_OWNER_INPUT

## Scenario Stress Learnings

Regulated crypto needs no ROI/return guarantees and legal review. Beauty clinic needs safety/before-after/booking dependency tracking. AI agency needs proof without leaking internal infrastructure or overpromising ROI.

## Usage

Every template pack must include these fields before copy sections and must fail the QA gate if forbidden claims are unresolved.
