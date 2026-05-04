# WebStudio Specialist Agent Matrix

## Overview

WebStudio uses a multi-agent architecture with 11 specialized workspaces plus the main orchestrator workspace.

## Workspace Registry

| # | Workspace | Role | Location | Status |
|---|-----------|------|----------|--------|
| 0 | workspace (main) | Orchestrator | `~/.openclaw/workspace/` | ✅ Active |
| 1 | workspace-requirements-analyst | PRD + acceptance criteria | `~/.openclaw/workspace-requirements-analyst/` | ✅ Active |
| 2 | workspace-solution-architect | Architecture design | `~/.openclaw/workspace-solution-architect/` | ✅ Active |
| 3 | workspace-test-architect | Test strategy | `~/.openclaw/workspace-test-architect/` | ✅ Active |
| 4 | workspace-security-auditor | Security audits | `~/.openclaw/workspace-security-auditor/` | ✅ Active |
| 5 | workspace-release-manager | Git discipline | `~/.openclaw/workspace-release-manager/` | ✅ Active |
| 6 | workspace-knowledge-librarian | Documentation | `~/.openclaw/workspace-knowledge-librarian/` | ✅ Active |
| 7 | workspace-product-ux | UX review | `~/.openclaw/workspace-product-ux/` | ✅ Active |
| 8 | workspace-quality-governor | Final gate | `~/.openclaw/workspace-quality-governor/` | ✅ Active |
| 9 | workspace-error-guardian | Error handling | `~/.openclaw/workspace-error-guardian/` | ✅ Active |
| 10 | workspace-task-contract-enforcer | Task compliance | `~/.openclaw/workspace-task-contract-enforcer/` | ✅ Active |
| 11 | workspace-skill-curator | Skill discovery/install | `~/.openclaw/workspace-skill-curator/` | ✅ Active |

## Execution Flow

```
User Request
    ↓
Task Contract Enforcer (create contract)
    ↓
Requirements Analyst (PRD + criteria)
    ↓
Solution Architect (architecture)
    ↓
Test Architect (test strategy)
    ↓
Security Auditor (risk assessment)
    ↓
Skill Curator (discover/install skills)
    ↓
Builder/Worker (implementation)
    ↓
Product UX (UX review)
    ↓
Release Manager (git discipline)
    ↓
Knowledge Librarian (documentation)
    ↓
Quality Governor (FINAL GATE)
    ↓
Completion
```

## Brain Files per Workspace

Each workspace has 6 brain files:

| File | Purpose |
|------|---------|
| SOUL.md | Identity, role boundaries, core mission |
| AGENTS.md | Operating policy, checklists, handoff protocols |
| TOOLS.md | Available tools, commands, git discipline |
| BOOT.md | Bootstrap sequence, startup checklist |
| HEARTBEAT.md | Status check policy, report format |
| MEMORY.md | Context, prior lessons, state substrate |

## Specialist Responsibilities

### Requirements Analyst
- Extract problem statement from ambiguous requests
- Define scope (in/out), assumptions, constraints
- Surface risks early
- Write verifiable acceptance criteria
- Hand off to Solution Architect or Builder

### Solution Architect
- Design system architecture
- Define component boundaries
- Specify data flow
- Identify integration points
- Hand off to Builder/Worker

### Test Architect
- Define test strategy
- Specify smoke/regression/integration tests
- Define acceptance test criteria
- Verify test coverage
- Hand off to Quality Governor

### Security Auditor
- Review for security risks
- Check for secret leakage
- Verify sandbox boundaries
- Assess third-party skill safety
- Hand off to Quality Governor

### Release Manager
- Enforce git discipline
- Manage commits/pushes
- Handle branch strategy
- Prevent `git add .`
- Report commit hashes

### Knowledge Librarian
- Maintain documentation
- Update skill registry
- Document decisions (ADRs)
- Organize docs structure
- Hand off to Quality Governor

### Product UX
- Review UI changes
- Verify visual hierarchy
- Check user flow
- Validate accessibility
- Hand off to Quality Governor

### Quality Governor
- Run 6-layer verification
- Output hard-gate verdict
- Cannot be bypassed
- Final authority on completion

### Error Guardian
- Handle runtime errors
- Implement error boundaries
- Design retry logic
- Document error patterns
- Hand off to Quality Governor

### Task Contract Enforcer
- Create Task Contracts
- Track checklist status
- Block premature COMPLETE
- Apply safe defaults
- Output compliance verdict

### Skill Curator
- Discover relevant skills
- Inspect SKILL.md
- Security screen candidates
- Install safe skills
- Maintain skill registry

## Handoff Protocol

Each specialist must:
1. Complete their assigned work
2. Document output in appropriate location
3. Notify next specialist in chain
4. Quality Governor must approve before completion

## TASK CONTRACT RULE

**No specialist may report COMPLETE unless the assigned contract items are explicitly checked. If any required proof is missing, report REJECTED — REWORK REQUIRED or BLOCKED. Do not ask the user when a safe non-destructive default exists.**

## See Also

- `docs/webstudio-specialist-workspaces.md` — Full registry with handoff details
- `docs/webstudio-task-contract-enforcement.md` — Task contract policy
- `docs/webstudio-skill-curator-policy.md` — Skill discovery/install policy
- `docs/webstudio-definition-of-done.md` — Definition of done criteria
