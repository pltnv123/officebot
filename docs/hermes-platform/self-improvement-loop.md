# Hermes Self-Improvement Loop

## Overview

Hermes continuously improves through a self-improvement loop that captures learnings and updates skills/runbooks.

## Improvement Triggers

Self-improvement is triggered when:
- A task succeeds with 5+ tool calls
- Errors are overcome through discovery
- User-corrected approach works
- Non-trivial workflow is discovered
- User asks to remember a procedure

## Improvement Process

1. **Identify pattern or pitfall** during work
2. **Document the discovery** in run report
3. **Create/update skill or runbook**
4. **Test the improvement** locally if possible
5. **Index in QMD** via `qmd update`
6. **Run hfinalize**

## Allowed Improvements (Autonomous)

- Update local skills with discovered pitfalls
- Create new skills for recurring patterns
- Improve AGENTS.md with verified conventions
- Update runbooks with lessons learned
- Create documentation for discovered workflows
- Propose patch packages for recurring issues

## Improvement Limits

Self-improvement must NOT:
- Change source code without approval
- Change workflows without approval
- Change runtime behavior without approval
- Create infinite recursion loops
- Consume unbounded resources
- Modify skills outside `~/.hermes/skills/`

## Skill Lifecycle

1. **Create**: When complex task succeeds or pattern discovered
2. **Update**: When instructions are stale/wrong or pitfalls found
3. **Patch**: Use `skill_manage(action='patch')` for fixes
4. **Delete**: Only when absorbed into umbrella skill or truly stale

## Current Skills (Autonomy-Related)

- `autonomy-control-plane`
- `autonomous-backlog-manager`
- `docs-only-pr-operator`
- `qmd-librarian`
- `autonomous-finalizer`

## Knowledge Indexing

After improvements:
```bash
qmd update
qmd search "<topic>" -n 5
```

## Retrospective

Periodic self-improvement retrospectives:
- What was improved
- Remaining bottlenecks
- Tasks Hermes can now do alone
- Tasks still requiring approval
- How to keep it running for hours
- How to avoid runaway behavior
- How to disable/pause autonomy
- Next recommended backlog item

See `/output/self-improvement-retrospective.md` for latest retrospective.
