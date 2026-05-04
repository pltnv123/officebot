# WebStudio Quality Loop Protocol

## Overview

Quality Loop is the continuous verification cycle that runs throughout development, not just at the end.

## Loop Stages

```
Plan → Build → Test → Review → Verify → (repeat) → Final Gate
```

## Stage 1: Plan

**Owner:** Requirements Analyst + Solution Architect

**Outputs:**
- Task Contract (from Task Contract Enforcer)
- PRD with acceptance criteria
- Architecture document
- Test strategy

**Quality Checks:**
- Acceptance criteria are verifiable
- Non-goals are explicit
- Risks are documented
- Test strategy covers all criteria

## Stage 2: Build

**Owner:** Builder/Worker

**Outputs:**
- Implementation code
- Unit tests
- Integration points

**Quality Checks:**
- Code follows conventions
- No debug statements
- No breaking changes
- Tests cover new code

## Stage 3: Test

**Owner:** Test Architect

**Outputs:**
- Smoke tests
- Regression tests
- Browser/manual-flow tests

**Quality Checks:**
- All tests pass
- Coverage is adequate
- Browser proof obtained (for UI)
- No flaky tests

## Stage 4: Review

**Owner:** Product UX + Security Auditor + Release Manager

**Outputs:**
- UX review report
- Security audit report
- Git discipline verification

**Quality Checks:**
- Visual hierarchy correct
- User flow works
- No security risks
- Git discipline followed

## Stage 5: Verify

**Owner:** Quality Governor

**Outputs:**
- 6-layer verification report
- Hard-gate verdict

**Quality Checks:**
1. **Static** — Code structure, file presence
2. **Smoke** — Basic functionality
3. **Regression** — Existing tests pass
4. **Runtime** — Server healthy
5. **Browser** — UI works in browser
6. **Delivery** — Artifact delivery functional

## Stage 6: Final Gate

**Owner:** Quality Governor

**Verdict:**
- **ACCEPTED** — All criteria met, all proofs present
- **CONDITIONALLY ACCEPTED** — Non-critical limitations documented
- **REJECTED — REWORK REQUIRED** — Requirements incomplete
- **BLOCKED** — Environmental/tooling blocker

## Loop Iteration

If any stage fails:
1. Identify exact failure
2. Route back to responsible specialist
3. Fix and re-run that stage
4. Continue loop

**Never skip stages.** Each stage gates the next.

## Continuous Quality

Quality is not a final step — it's continuous:

| Stage | Continuous Check |
|-------|------------------|
| Plan | Criteria verifiable? |
| Build | Conventions followed? |
| Test | Tests passing? |
| Review | UX/security OK? |
| Verify | All 6 layers pass? |
| Gate | Verdict ACCEPTED? |

## Escape Hatches

### Emergency Stop

If CRITICAL risk detected:
- Stop immediately
- Escalate to user
- Document exact issue
- Do not continue until resolved

### Safe Default

If uncertain:
- Assume higher risk
- Document uncertainty
- Request Quality Governor review
- Do not overclaim

### Timeout Handling

If subagent times out:
- Continue with manual verification
- Mark limitation in report
- Do not block entire milestone

## Evidence Requirements

Each stage must produce evidence:

| Stage | Evidence |
|-------|----------|
| Plan | Task Contract, PRD, Architecture |
| Build | Code diff, commit hash |
| Test | Test output, screenshots |
| Review | UX report, security scan |
| Verify | 6-layer checklist |
| Gate | Verdict + limitations |

## See Also

- `docs/webstudio-definition-of-done.md`
- `docs/webstudio-task-contract-enforcement.md`
- `workspace-quality-governor/SOUL.md`
