# Project Management Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/project-management/*.md`
- **Total Agents**: 6
- **Primary Robot**: PLANNER
- **Zone**: Product Zone (orange)
- **Telegram Topic**: `pm`
- **Escalation**: PLANNER → CHIEF

## Agent Mapping

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `project-management-experiment-tracker` | PLANNER/exp-track | PLANNER | Experiment tracking, A/B test results | `experiment`, `ab-test`, `results` |
| 2 | `project-management-jira-workflow-steward` | PLANNER/jira | PLANNER | Jira workflow optimization | `jira`, `workflow`, `board` |
| 3 | `project-management-project-shepherd` | PLANNER/shepherd | PLANNER | Project guidance, stakeholder mgmt | `project`, `stakeholder`, `status` |
| 4 | `project-management-studio-operations` | PLANNER/studio-ops | PLANNER | Studio operations, resource allocation | `studio-ops`, `resources`, `capacity` |
| 5 | `project-management-studio-producer` | PLANNER/producer | PLANNER | Executive creative/technical orchestration | `producer`, `portfolio`, `strategy` |
| 6 | `project-manager-senior` | PLANNER/senior-pm | PLANNER | Senior PM, complex project delivery | `senior-pm`, `delivery`, `risk` |

## Integration Notes
- All PM agents map to PLANNER — project management IS planning
- Uses shared Product Zone (orange)
- Studio Producer = highest-level PM agent, aligns vision with business
- Project Shepherd handles day-to-day task flow in OfficeBot

## Telegram Commands
- `/pm_status` — show all PM agents status
- `/pm_shepherd [project]` — project status check
- `/pm_experiment [name]` — experiment tracking
- `/pm_producer` — strategic overview

## Workflows
1. **Project Initiation** → CHIEF → PLANNER (producer) → scope → PLANNER (shepherd) → PLAN.md
2. **Daily Standup** → PLANNER (shepherd) → check status → update board
3. **Experiment Review** → PLANNER (exp-tracker) → results → insights → CHIEF
4. **Resource Planning** → PLANNER (studio-ops) → capacity → allocation → tasks
