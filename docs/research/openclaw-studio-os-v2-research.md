# OpenClaw Studio OS v2 Research

## Research Date

2026-05-04

## Purpose

Document research findings for Studio OS v2 architecture: multi-agent specialist workspaces with task contract enforcement and skill curation.

## Key Findings

### 1. Previous Failure Patterns

From analysis of OPENCLAW-WEBSTUDIO-STUDIO-OS-V2-001B:

| Pattern | Symptom | Root Cause |
|---------|---------|------------|
| Premature completion | "Done" without all proofs | No final gate enforcement |
| Partial work accepted | 3 of 20 tests done | No task contract checklist |
| Git divergence paralysis | Asked user instead of acting | No safe default policy |
| Vague requirements | "Improve UX" without criteria | No requirements analyst |
| Missing browser proof | curl-only for UI bugs | No browser proof requirement |
| No final gate | Quality Governor bypassed | No hard-gate authority |

### 2. OpenClaw Capabilities

#### Specialist Workspaces

OpenClaw supports multiple isolated workspaces:
- `~/.openclaw/workspace/` — Main orchestrator
- `~/.openclaw/workspace-*` — Specialist workspaces
- Each workspace has independent brain files (SOUL, AGENTS, TOOLS, BOOT, HEARTBEAT, MEMORY)
- Subagents can be spawned with isolated or forked context

#### Skills System

OpenClaw skills provide reusable capabilities:
- Search: `openclaw skills search "<query>"`
- Install: `openclaw skills install <slug>`
- List: `openclaw skills list`
- Check: `openclaw skills check`
- Workspace skills have highest precedence
- Third-party skills are untrusted until inspected

#### Lossless-Claw Memory

Session continuity via:
- `lcm_grep` — Search messages/summaries
- `lcm_expand_query` — Deep recall with subagent
- `lcm_describe` — Inspect specific summary
- Prevents stale milestone reports

### 3. Architecture Decisions

#### ADR-001: 6-Layer Verification

Quality Governor must verify:
1. Static — Code structure, file presence
2. Smoke — Basic functionality tests
3. Regression — Existing tests pass
4. Runtime — Server healthy, endpoints respond
5. Browser — UI works in browser (not curl-only)
6. Delivery — Artifact delivery page functional

#### ADR-002: Hard-Gate Authority

Quality Governor cannot be bypassed:
- Verdict: ACCEPTED / CONDITIONALLY ACCEPTED / REJECTED / BLOCKED
- No milestone complete without approval
- Evidence required for each layer

#### ADR-003: 9 Specialist Workspaces

| Workspace | Role |
|-----------|------|
| requirements-analyst | PRD + acceptance criteria |
| solution-architect | Architecture design |
| test-architect | Test strategy |
| security-auditor | Security audits |
| release-manager | Git discipline |
| knowledge-librarian | Documentation |
| product-ux | UX review |
| quality-governor | Final gate |
| error-guardian | Error handling |

Plus 2 compliance workspaces:
| workspace | Role |
|-----------|------|
| task-contract-enforcer | Task compliance |
| skill-curator | Skill discovery/install |

#### ADR-004: Virtual Path Labels

File tree uses virtual labels for UX:
- `/src` — Source code
- `/docs` — Documentation
- `/input` — User input files
- `/output` — Generated artifacts
- `/logs` — Execution logs
- `/meta` — Metadata/config

### 4. Safe Default Policy

| Situation | Safe Default |
|-----------|--------------|
| Git diverged | Safety branch, not force push |
| Missing skill | Search + inspect before install |
| Test outdated | Update narrowly, rerun |
| Subagent timeout | Manual verification + limitation |
| Uncertain source | Document uncertainty |

**Ask user ONLY for:**
- Destructive git operations (force push)
- Data deletion
- Production deployment
- Secret exposure
- Paid external service usage
- Irreversible architecture change

### 5. Task Contract Model

Every milestone requires:
1. Task Contract created before implementation
2. Checklist with DONE / NOT DONE / BLOCKED
3. Exact literal matching
4. Safe defaults documented
5. Final verdict from Task Contract Enforcer

### 6. Skill Curation Workflow

1. Classify task need
2. Search skills
3. Inspect candidate (SKILL.md)
4. Security screen
5. Install only if safe/useful
6. Run skills check
7. Document in registry

### 7. State Substrate

WebStudio uses multiple state sources:

| Source | Purpose | Access |
|--------|---------|--------|
| QWD/QMD | Project decisions | `/api/state` |
| lossless-claw | Session history | `lcm_*` tools |
| Supabase | Artifacts, runs | DB/API |
| Git | Code versioning | `git` commands |
| Workspace files | Agent instructions | File system |

## Conclusions

Studio OS v2 architecture addresses previous failures by:

1. **Task Contract Enforcer** — Prevents premature completion
2. **Quality Governor hard-gate** — Cannot be bypassed
3. **Specialist workspaces** — Clear role boundaries
4. **Skill Curator** — Reusable capabilities, security screening
5. **Safe defaults** — No unnecessary user clarification
6. **6-layer verification** — Comprehensive quality checks
7. **lossless-claw** — Session continuity, no stale reports

## Next Steps

1. Implement all specialist workspaces
2. Create custom skills (task-contract-enforcer, skill-curator)
3. Update main brain files
4. Create documentation
5. Run validation
6. Commit/push safely

## References

- `docs/webstudio-specialist-agent-matrix.md`
- `docs/webstudio-task-contract-enforcement.md`
- `docs/webstudio-skill-curator-policy.md`
- `docs/webstudio-definition-of-done.md`
- `workspace-*/SOUL.md` — Specialist workspace identities
