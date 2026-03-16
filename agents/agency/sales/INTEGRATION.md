# Sales Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/sales/*.md`
- **Total Agents**: 8
- **Primary Robot**: CHIEF
- **Zone**: Dispatch Zone (amber)
- **Telegram Topic**: `sales`
- **Escalation**: CHIEF → Direct to Anton

## Agent Mapping

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `sales-account-strategist` | CHIEF/account | CHIEF | Account strategy, key accounts | `account`, `key-account`, `enterprise` |
| 2 | `sales-coach` | CHIEF/coach | CHIEF | Sales coaching, skill development | `sales-coach`, `training`, `skill` |
| 3 | `sales-deal-strategist` | CHIEF/deal | CHIEF | Deal strategy, negotiation | `deal`, `negotiation`, `close` |
| 4 | `sales-discovery-coach` | CHIEF/discovery | CHIEF | Discovery call coaching | `discovery`, `qualification`, `needs` |
| 5 | `sales-engineer` | CHIEF/sales-eng | CHIEF | Technical sales, demos | `demo`, `technical-sales`, `poc` |
| 6 | `sales-outbound-strategist` | CHIEF/outbound | CHIEF | Outbound sales strategy | `outbound`, `prospecting`, `pipeline` |
| 7 | `sales-pipeline-analyst` | CHIEF/pipeline | CHIEF | Pipeline analysis, forecasting | `pipeline`, `forecast`, `crm` |
| 8 | `sales-proposal-strategist` | CHIEF/proposal | CHIEF | Proposal writing, RFP responses | `proposal`, `rfp`, `bid` |

## Integration Notes
- All sales agents map to CHIEF — sales is strategic, routes directly to Anton
- Sales zone = amber Dispatch Zone area with label "SALES"
- Sales has highest escalation priority — goes to Anton directly
- No intermediate robot — CHIEF handles all sales directly

## Telegram Commands
- `/sales_status` — show all sales agents status
- `/sales_pipeline` — view pipeline analysis
- `/sales_deal [account]` — deal strategy request
- `/sales_proposal [client]` — proposal assistance
- `/sales_demo [product]` — demo preparation

## Workflows
1. **Deal Strategy** → Anton → CHIEF (deal-strategist) → strategy → Anton approve → execute
2. **Pipeline Review** → CHIEF (pipeline-analyst) → forecast → CHIEF → Anton report
3. **Proposal** → CHIEF (proposal-strategist) → draft → CHIEF review → Anton → send
4. **Demo Prep** → CHIEF (sales-engineer) → technical prep → deliver → follow-up
