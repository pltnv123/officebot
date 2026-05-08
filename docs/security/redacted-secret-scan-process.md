# Redacted Secret Scan Process

## APR-004 Scope

APR-004 approved a local report-only redacted secret scan workflow.

## Tool Contract

`/workspace/bin/hsecret-scan-redacted` scans local text files only and outputs:

- pattern type
- file path
- line number
- redacted evidence only
- confidence
- recommended owner action

## Hard Rules

- No external uploads.
- No remediation.
- No file edits.
- No history rewrite.
- No raw secret-like output.
- Owner privately reviews findings before any action.

## Outputs

- `/output/secret-scan-redacted-findings.csv`
- `/output/secret-scan-redacted-report.md`
- `/output/secret-scan-owner-review-workflow.md`
- `/output/secret-scan-next-approval-request.md`

Any remediation, rotation, or history rewrite requires a separate explicit approval.
