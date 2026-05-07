# Redacted Secret Scan Process

Use local report-only secret scans that never print raw values.

## Rules
- Redacted evidence only.
- No external uploads.
- No remediation without owner approval.
- Skip `.env`, private keys, credential stores, `.git`, dependency caches, binary and large files.

## Output
CSV fields: pattern_type, path, line, redacted_evidence.
