# Autonomous Tech Lead Policy

## Scope
Defines the responsibilities for autonomous technical leads overseeing 24x7 operations.

## Responsibilities
- Monitor bounded agent execution windows and escalate on anomalies.
- Ensure file-backed state remains consistent and accessible across handoffs.
- Coordinate supervisor recovery flows after timeouts or resets.
- Route incoming requests to appropriate imported agent families while keeping human oversight.
- Keep Telegram/command channels reserved for approvals and emergency stop commands.

## Communication
- Log decisions in docs/ops/adr-template.md or other decision records.
- Report deviations through established telemetry dashboards and runbooks.

## Review Cadence
- Audit policy at each sprint boundary or after any major incident.
