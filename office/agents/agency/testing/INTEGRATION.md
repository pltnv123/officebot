# Testing Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/testing/*.md`
- **Total Agents**: 8
- **Primary Robot**: REVIEWER
- **Zone**: Design Zone (purple) — shared with Design
- **Telegram Topic**: `testing`
- **Escalation**: REVIEWER → WORKER → CHIEF

## Agent Mapping

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `testing-accessibility-auditor` | REVIEWER/a11y-audit | REVIEWER | WCAG compliance, a11y audits | `a11y-audit`, `wcag`, `accessibility` |
| 2 | `testing-api-tester` | REVIEWER/api-test | REVIEWER | API testing, contract tests | `api-test`, `contract`, `integration-test` |
| 3 | `testing-evidence-collector` | REVIEWER/evidence | REVIEWER | Test evidence, screenshots, logs | Auto-triggered on test runs |
| 4 | `testing-performance-benchmarker` | REVIEWER/perf | REVIEWER | Performance benchmarks, load tests | `benchmark`, `load-test`, `perf` |
| 5 | `testing-reality-checker` | REVIEWER/reality | REVIEWER | Validates outputs against specs | Auto-triggered before deploy |
| 6 | `testing-test-results-analyzer` | REVIEWER/analyze | REVIEWER | Test result analysis, trends | Post-test-run analysis |
| 7 | `testing-tool-evaluator` | REVIEWER/tools | REVIEWER | Testing tool evaluation | `test-tool`, `evaluation` |
| 8 | `testing-workflow-optimizer` | REVIEWER/workflow-opt | REVIEWER | Test workflow optimization | `test-workflow`, `ci-optimize` |

## Integration Notes
- All testing agents map to REVIEWER — testing IS quality review
- Uses shared Design Zone (purple) with label "TESTING"
- Evidence Collector auto-triggers on every BUILDER CI run
- Reality Checker is final gate before deployment
- Performance Benchmarker critical for WebGL scene

## Telegram Commands
- `/test_status` — show all testing agents status
- `/test_a11y [url]` — run accessibility audit
- `/test_api [endpoint]` — API test request
- `/test_perf [url]` — performance benchmark
- `/test_evidence [task]` — collect test evidence

## Workflows
1. **CI Test Run** → BUILDER runs → REVIEWER (evidence-collector) → logs/screenshots → REVIEWER (results-analyzer) → report
2. **Pre-Deploy Gate** → REVIEWER (reality-checker) → validate specs → PASS/FAIL → CHIEF
3. **Performance Test** → REVIEWER (perf-benchmarker) → benchmark → report → WORKER optimize
4. **A11y Audit** → REVIEWER (a11y-auditor) → WCAG check → report → WORKER fixes
5. **API Testing** → REVIEWER (api-tester) → contract tests → results → WORKER
