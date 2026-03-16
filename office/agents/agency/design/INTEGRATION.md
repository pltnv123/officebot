# Design Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/design/*.md`
- **Total Agents**: 8
- **Primary Robot**: REVIEWER
- **Zone**: Design Zone (purple)
- **Telegram Topic**: `design`
- **Escalation**: REVIEWER → PLANNER → CHIEF

## Agent Mapping

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `design-ui-designer` | REVIEWER/ui | REVIEWER | UI design, visual components, design systems | `design`, `ui`, `visual` |
| 2 | `design-ux-researcher` | REVIEWER/ux | REVIEWER | User research, usability testing | `ux`, `research`, `user-test` |
| 3 | `design-brand-guardian` | REVIEWER/brand | REVIEWER | Brand consistency, style guidelines | `brand`, `identity`, `style` |
| 4 | `design-visual-storyteller` | REVIEWER/story | REVIEWER | Visual narratives, presentations | `presentation`, `story`, `visual` |
| 5 | `design-whimsy-injector` | REVIEWER/whimsy | REVIEWER | Fun details, micro-interactions, polish | `whimsy`, `polish`, `delight` |
| 6 | `design-ux-architect` | REVIEWER/ux-arch | REVIEWER | Information architecture, navigation | `ia`, `navigation`, `flow` |
| 7 | `design-image-prompt-engineer` | REVIEWER/img | REVIEWER | AI image generation prompts | `image`, `prompt`, `ai-art` |
| 8 | `design-inclusive-visuals-specialist` | REVIEWER/a11y | REVIEWER | Accessibility, inclusive design | `a11y`, `inclusive`, `accessibility` |

## Integration Notes
- All design agents map to REVIEWER — they validate visual quality and design consistency
- Design zone = purple floor area with label "DESIGN"
- UI Designer feeds into Unity scene visual quality checks
- Brand Guardian ensures scene colors match OfficeBot brand

## Telegram Commands
- `/design_status` — show all design agents status
- `/design_review [task]` — request design review
- `/design_a11y [url]` — run accessibility audit

## Workflows
1. **Design Review** → WORKER submits → REVIEWER (ui-designer) → feedback → WORKER
2. **Brand Check** → REVIEWER (brand-guardian) → validates → APPROVE/CHANGES
3. **A11y Audit** → REVIEWER (inclusive-visuals) → report → WORKER fixes
4. **Whimsy Pass** → REVIEWER (whimsy-injector) → polish suggestions → WORKER
