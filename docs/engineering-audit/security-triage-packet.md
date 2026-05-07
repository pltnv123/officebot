# officebot security triage packet

## Scope
Redacted-only triage packet. No raw secrets, `.env`, credential files, hosts.yml, or private key values are printed.

## Findings summary
- Redacted findings: 81
- CSV: `/output/officebot-secret-hit-summary-redacted.csv`

## Owner review workflow
1. Review CSV paths locally in a private environment.
2. Decide whether each finding is a false positive, fixture, or real credential.
3. If real, rotate/revoke credential first.
4. Only after rotation, decide whether file cleanup/history rewrite is required.
5. History rewrite requires separate explicit approval and coordination.

## GitGuardian interpretation
If GitGuardian or GitHub secret scanning is enabled, compare alerts privately. Do not paste raw alert secrets into chat or reports.
