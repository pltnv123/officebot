# Proposal Scoring

## hproposal-score Tool

Local report-only proposal quality scorer (0-100).

## Scoring Criteria (100 pts)

- Offer/scope clarity: 30 pts
- Pricing clarity: 15 pts
- Risk disclosure: 15 pts
- Owner dependencies: 15 pts
- Timeline realism: 10 pts
- Compliance-safe language: 10 pts
- Acceptance criteria: 5 pts
- CTA/next steps: 10 pts

## Verdicts

- proposal_ready (>=90)
- ready_with_caveats (>=75)
- needs_owner_input (>=60)
- compliance_review_required
- needs_revision

## Outputs

- `/output/hproposal-score-results.csv`
- `/output/hproposal-score-report.md`
- `/output/hproposal-score-improvement-plan.md`

## Safety

No external calls. Report-only. Exit-zero behavior.
