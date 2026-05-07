# Repo Hygiene — ADR Package

This directory contains Architecture Decision Records (ADRs) and supporting documentation for officebot repository hygiene decisions.

## Documents

| Document | Purpose |
|----------|---------|
| [adr-runtime-state-strategy.md](./adr-runtime-state-strategy.md) | ADR: Runtime state file tracking and cleanup strategy |
| [adr-build-artifact-strategy.md](./adr-build-artifact-strategy.md) | ADR: Build artifact management and retention policy |
| [adr-visual-evidence-strategy.md](./adr-visual-evidence-strategy.md) | ADR: Visual evidence (PNG/screenshots) handling strategy |
| [pr25-readiness-checklist.md](./pr25-readiness-checklist.md) | PR #25 readiness verification checklist |
| [next-safe-pr-recommendation.md](./next-safe-pr-recommendation.md) | Recommendations for next safe cleanup PR |

## Scope Notice

**This ADR package is documentation only.** No cleanup, untracking, or file movement is performed in PR #25. These documents establish the architecture decisions required before any future cleanup operations can proceed safely.

## Related

- PR #22: Tracked artifact cleanup manifest
- PR #23: `live_ops_daemon.log` untracking
- PR #24: `.tasks.backup.json`, `.runtime_progress.json`, `.live_ops.jsonl` untracking
- PR #25: ADR package (this directory) — docs only
