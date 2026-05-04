# WebStudio Definition of Done

## Milestone Completion Criteria

A milestone is **DONE** only when ALL of the following are true:

### 1. Task Contract Complete
- [ ] Task Contract created from user instruction
- [ ] All contract items marked DONE
- [ ] No missing items (or explicitly accepted as limitations)
- [ ] Task Contract Enforcer verdict = ACCEPTED or CONDITIONALLY ACCEPTED

### 2. Implementation Complete
- [ ] Code changes implemented
- [ ] No breaking changes to existing functionality
- [ ] Code follows project conventions
- [ ] No debug/logging statements left in production code

### 3. Tests Pass
- [ ] Relevant smoke tests created/updated
- [ ] Smoke tests pass
- [ ] Regression tests pass (if applicable)
- [ ] Browser/manual-flow tests pass (for UI changes)

### 4. Server Health Verified
- [ ] Server restarted (if frontend/backend changed)
- [ ] `/webstudio/demo` returns HTTP 200
- [ ] No errors in server logs
- [ ] Affected endpoints respond correctly

### 5. Browser Proof (for UI changes)
- [ ] UI tested in browser (not curl-only)
- [ ] Visual appearance matches requirements
- [ ] User flow works end-to-end
- [ ] No console errors

### 6. Git Discipline
- [ ] Changes committed with descriptive message
- [ ] Changes pushed to GitHub
- [ ] Commit hash recorded in report
- [ ] No `git add .` used
- [ ] No logs/runtime storage committed
- [ ] No secrets committed

### 7. Documentation Updated
- [ ] Relevant docs updated
- [ ] Skill registry updated (if skills changed)
- [ ] ADRs created for significant decisions
- [ ] MEMORY.md updated with lessons learned

### 8. Quality Governor Approval
- [ ] 6-layer verification complete
- [ ] Verdict = ACCEPTED or CONDITIONALLY ACCEPTED
- [ ] Limitations documented (if conditionally accepted)
- [ ] No REJECTED verdict

### 9. Final Report Complete
- [ ] Report in Russian (for user-facing communication)
- [ ] Commit hash included
- [ ] Push status included
- [ ] Server PID included
- [ ] Health check results included
- [ ] Smoke test results included
- [ ] Manual QA checklist included
- [ ] Known limitations included

## Quality Governor 6-Layer Verification

| Layer | Check | Evidence Required |
|-------|-------|-------------------|
| 1. Static | Code structure, file presence | File listing, diff |
| 2. Smoke | Basic functionality | Smoke test output |
| 3. Regression | Existing tests pass | Test output |
| 4. Runtime | Server healthy, endpoints respond | curl, logs |
| 5. Browser | UI works in browser | Screenshot, manual flow |
| 6. Delivery | Artifact delivery functional | Delivery page test |

## Verdict Definitions

| Verdict | Meaning |
|---------|---------|
| **ACCEPTED** | All criteria met, all proofs present |
| **CONDITIONALLY ACCEPTED** | Non-critical limitations documented, acceptable for release |
| **REJECTED — REWORK REQUIRED** | Requirements incomplete or proof insufficient |
| **BLOCKED** | Environmental/tooling blocker prevents completion |

## Safe Defaults

When in doubt, use these safe defaults:

| Situation | Default |
|-----------|---------|
| Git diverged | Safety branch, not force push |
| Missing skill | Search + inspect before install |
| Test outdated | Update narrowly, rerun |
| Subagent timeout | Manual verification + mark limitation |
| Uncertain source | Document uncertainty, do not overclaim |

## Never Accept

The following are NEVER acceptable as "done":

- ❌ "Looks good" without browser proof
- ❌ curl-only for UI bugs
- ❌ Partial test suite when full suite requested
- ❌ Commit without push (when push required)
- ❌ `git add .` in commit history
- ❌ Secrets in committed files
- ❌ Quality Governor bypassed
- ❌ Task Contract checklist incomplete

## See Also

- `docs/webstudio-task-contract-enforcement.md`
- `docs/webstudio-quality-loop-protocol.md`
- `docs/acceptance/` — Individual milestone acceptance reports
