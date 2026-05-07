# officebot evidence and artifacts governance

## Scope
Screenshots, b64, artefacts, logs, debug outputs, demo evidence, and release artifacts.

## Current candidate examples
- Candidate rows: 78
- CSV: `/output/officebot-evidence-taxonomy.csv`

## Retention rules
- Demo evidence: keep curated docs/evidence entries.
- Test fixtures: keep stable, named fixtures.
- Debug output: generated/ignored unless attached to a report.
- Generated transient: ignored or archived outside source tree.
- Release artifact: managed through release/deploy pipeline.
- Unknown: manual owner decision.

## Future directory structure
- `docs/evidence/`
- `docs/evidence/YYYY-MM-DD/`
- `artefacts/archive/`
- generated ignored runtime/artifact paths.
