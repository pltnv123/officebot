# Product Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/product/*.md`
- **Total Agents**: 5
- **Primary Robot**: PLANNER
- **Zone**: Product Zone (orange)
- **Telegram Topic**: `product`
- **Escalation**: PLANNER → CHIEF

## Agent Mapping

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `product-behavioral-nudge-engine` | PLANNER/nudge | PLANNER | Behavioral nudges, habit design | `nudge`, `behavioral`, `habit` |
| 2 | `product-feedback-synthesizer` | PLANNER/feedback | PLANNER | User feedback synthesis | `feedback`, `user-feedback`, `synthesis` |
| 3 | `product-manager` | PLANNER/pm | PLANNER | Product management, roadmapping | `product`, `roadmap`, `feature` |
| 4 | `product-sprint-prioritizer` | PLANNER/sprint | PLANNER | Sprint prioritization, backlog | `sprint`, `prioritize`, `backlog` |
| 5 | `product-trend-researcher` | PLANNER/trend | PLANNER | Market trends, competitive analysis | `trend`, `market`, `competitive` |

## Integration Notes
- All product agents map to PLANNER — product decisions are core planning
- Product zone = orange floor area with label "PRODUCT"
- Product Manager is the most critical agent — owns roadmap
- Sprint Prioritizer directly feeds into task queue

## Telegram Commands
- `/product_status` — show all product agents status
- `/product_roadmap` — view current roadmap
- `/product_sprint [priority]` — sprint prioritization request
- `/product_feedback [source]` — synthesize feedback
- `/product_trend [area]` — trend research request

## Workflows
1. **Sprint Planning** → CHIEF → PLANNER (sprint-prioritizer) → priorities → PLAN.md → WORKER
2. **Feature Request** → PLANNER (product-manager) → spec → review → WORKER implement
3. **Feedback Loop** → PLANNER (feedback-synthesizer) → insights → roadmap update
4. **Trend Analysis** → PLANNER (trend-researcher) → report → strategic decisions
