# hwebqa-v3 Production QA Scorer

## Scope

`hwebqa-v3` is a local report-only static QA scorer for WebStudio simulated delivery packages.

## Scoring (0-100)

- Meta title/description: 15 pts
- Heading structure: 10 pts
- CTA clarity: 15 pts
- Forbidden claims absent: 20 pts
- Owner dependencies documented: 15 pts
- Accessibility basics: 10 pts
- Responsive CSS: 10 pts
- No secret-like strings: 5 pts

## Verdicts

- ready
- ready_with_caveats
- blocked_by_owner_dependency
- blocked_by_compliance
- needs_revision

## Outputs

- `/output/hwebqa-v3-production-results.csv`
- `/output/hwebqa-v3-production-summary.md`
- `/output/hwebqa-v3-release-verdicts.csv`

## Safety

No external calls, no deployment, exit-zero report-only behavior.
