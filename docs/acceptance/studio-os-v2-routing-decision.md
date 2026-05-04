# Studio OS v2 Routing Decision

## Decision Date

2026-05-04

## Context

Previous Studio OS v2 attempt (OPENCLAW-WEBSTUDIO-STUDIO-OS-V2-001B) failed because:
- Task stopped mid-execution due to git divergence
- User was asked to choose git strategy instead of applying safe default
- Skills were not created/installed
- Main brain files not fully updated
- Quality Governor/Error Guardian brains not updated
- Missing docs not all created
- Final commit/push not completed

## Decision

**Route:** Apply safe non-destructive defaults instead of asking user.

**Git Strategy:** 
- If not diverged → commit/push main normally
- If diverged → create safety branch, push there, do NOT force push

**Skill Strategy:**
- Create custom WebStudio skills locally
- Do not install third-party skills without inspection
- Use `openclaw skills check` to verify

**Brain Update Strategy:**
- Update main workspace brain files (SOUL, AGENTS, TOOLS, BOOT, HEARTBEAT, MEMORY)
- Add TASK CONTRACT RULE to all specialist AGENTS.md
- Add Skill Curator workflow to TOOLS.md

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Ask user for git strategy | Violates safe default policy, causes paralysis |
| Force push | Destructive, requires explicit authorization |
| Skip skills | Incomplete implementation |
| Skip brain updates | Specialists would not enforce contracts |
| Skip docs | Knowledge not preserved |

## Safe Defaults Applied

1. **Git divergence** → Safety branch (not used in this run — main was synchronized)
2. **Missing skills** → Create custom skills locally
3. **Missing docs** → Create all required docs
4. **Brain updates** → Update all specialist AGENTS.md with TASK CONTRACT RULE

## Outcome

- Main branch synchronized with origin/main (037152d)
- No safety branch needed
- All 11 specialist workspaces verified
- 2 compliance workspaces created (task-contract-enforcer, skill-curator)
- 8 custom skills created in workspace/skills/
- 12 required docs created
- Main brain files updated (SOUL, AGENTS)
- All specialist AGENTS.md updated with TASK CONTRACT RULE
- Stale context scan: clean (no OfficeBot/Pixar references)
- Secret scan: only documentation references (no actual secrets)

## Precedent

This decision establishes:
1. Safe defaults over user clarification for non-destructive operations
2. Safety branch for git divergence (not force push)
3. Task Contract Enforcer mandatory before implementation
4. Skill Curator mandatory when skills may help
5. Quality Governor hard-gate cannot be bypassed
6. All required docs must exist before COMPLETE

## Next Steps

If future git divergence occurs:
1. Create safety branch automatically
2. Push to safety branch
3. Report branch name and commit hash
4. Do not ask user unless force push required

## See Also

- `docs/webstudio-task-contract-enforcement.md`
- `docs/webstudio-skill-curator-policy.md`
- `docs/webstudio-definition-of-done.md`
- `docs/acceptance/studio-os-v2-dry-run.md`
