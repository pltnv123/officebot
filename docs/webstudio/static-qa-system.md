# WebStudio Static QA System

## Tool

`/workspace/bin/hwebqa` is a local-only static QA runner for generated simulated `static-site` directories.

## Checks

- Required files: `index.html`, `styles.css`, `README.md`.
- HTML metadata: title and meta description.
- Required sections: hero, offer, proof, CTA.
- CTA count and link labels.
- Forbidden claim patterns.
- Placeholder markers and owner dependencies.
- Accessibility hints: alt attributes, heading hierarchy, aria labels.
- Responsive CSS markers: `@media`, `max-width`, grid behavior.

## Outputs

- `/output/hwebqa-all-scenarios-report.md`
- `/output/hwebqa-findings.csv`
- `/output/hwebqa-release-verdicts.csv`

## Safety

The QA runner never calls external services, never deploys, and exits 0 with findings so it can be used in report-only autonomous workflows.
