# Paid Media Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/paid-media/*.md`
- **Total Agents**: 7
- **Primary Robot**: PLANNER
- **Zone**: Product Zone (orange)
- **Telegram Topic**: `paid-media`
- **Escalation**: PLANNER → CHIEF

## Agent Mapping

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `paid-media-auditor` | PLANNER/pm-audit | PLANNER | Paid media account auditing | `pm-audit`, `account-review` |
| 2 | `paid-media-creative-strategist` | PLANNER/pm-creative | PLANNER | Ad creative strategy | `pm-creative`, `ad-creative` |
| 3 | `paid-media-paid-social-strategist` | PLANNER/pm-social | PLANNER | Paid social campaigns | `pm-social`, `paid-social` |
| 4 | `paid-media-ppc-strategist` | PLANNER/pm-ppc | PLANNER | PPC campaign optimization | `ppc`, `google-ads`, `sem` |
| 5 | `paid-media-programmatic-buyer` | PLANNER/pm-programmatic | PLANNER | Programmatic ad buying | `programmatic`, `dsp`, `rtb` |
| 6 | `paid-media-search-query-analyst` | PLANNER/pm-query | PLANNER | Search query analysis | `search-query`, `keyword-analysis` |
| 7 | `paid-media-tracking-specialist` | PLANNER/pm-tracking | PLANNER | Tracking, attribution, pixels | `tracking`, `attribution`, `pixel` |

## Integration Notes
- All paid media agents map to PLANNER — budget allocation and campaign strategy
- Uses shared Product Zone (orange)
- Paid media budget decisions flow through CHIEF

## Telegram Commands
- `/paidmedia_status` — show all paid media agents
- `/paidmedia_audit [account]` — request account audit
- `/paidmedia_ppc [campaign]` — PPC optimization request
- `/paidmedia_tracking [pixel]` — tracking setup help

## Workflows
1. **Campaign Launch** → CHIEF → PLANNER (pm-strategist) → plan → execute → monitor
2. **Account Audit** → PLANNER (pm-auditor) → analysis → recommendations → CHIEF
3. **Creative Testing** → PLANNER (pm-creative) → variants → A/B test → optimize
