# Academic Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/academic/*.md`
- **Total Agents**: 5
- **Primary Robot**: PLANNER
- **Zone**: Product Zone (orange)
- **Telegram Topic**: `academic`
- **Escalation**: PLANNER → CHIEF

## Agent Mapping

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `academic-anthropologist` | PLANNER/anthro | PLANNER | Cultural analysis, user behavior patterns | `research`, `culture`, `behavior` |
| 2 | `academic-geographer` | PLANNER/geo | PLANNER | Spatial analysis, location intelligence | `location`, `spatial`, `maps` |
| 3 | `academic-historian` | PLANNER/history | PLANNER | Historical context, precedent research | `history`, `context`, `precedent` |
| 4 | `academic-narratologist` | PLANNER/narrative | PLANNER | Story structure, narrative design | `story`, `narrative`, `content` |
| 5 | `academic-psychologist` | PLANNER/psych | PLANNER | User psychology, behavioral design | `psychology`, `ux-research`, `behavior` |

## Integration Notes
- All academic agents map to PLANNER — they provide research and analysis that informs planning decisions
- No additional scene zones needed — uses Product Zone
- Research outputs feed into PLAN.md via PLANNER

## Telegram Commands
- `/academic_status` — show all academic agents status
- `/academic_anthro [query]` — query anthropologist agent
- `/academic_psych [query]` — query psychologist agent

## Workflows
1. **Research Request** → CHIEF → PLANNER → academic agent → findings → PLAN.md
2. **Behavioral Analysis** → PLANNER → psychologist → recommendations → sprint planning
3. **Narrative Review** → PLANNER → narratologist → content strategy → WORKER
