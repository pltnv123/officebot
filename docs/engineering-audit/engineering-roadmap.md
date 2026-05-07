# officebot 2–4 week engineering roadmap

## Executive recommendation
Continue docs/proposal-first, then one narrow approved implementation PR at a time. Do not combine runtime cleanup, Build migration, workflow fixes, and evidence reorg in one PR.

## Proposed sequence
1. PR28 CI/CD docs-only diagnostic package / deep audit (this batch).
2. PR29 runtime state checklist or limited cleanup after approval.
3. PR30 build artifact release prep.
4. PR31 visual evidence reorganization prep.
5. PR32 test harness proposal.
6. PR33 actual CI fix after approval.
7. PR34 limited runtime cleanup after approval.
8. PR35 Build release migration after approval.

## Roadmap CSV
See `/output/officebot-pr-roadmap.csv`.

## Operating principle
Every destructive or runtime-impacting action requires separate explicit approval with exact paths/scope.
