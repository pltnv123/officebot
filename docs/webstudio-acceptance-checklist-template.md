# WebStudio Acceptance Checklist Template

Use this template before reporting any milestone as COMPLETE.

---

## Milestone title

`<MILESTONE-NAME>`

## Requested scope

- [ ] List exact requested features/changes from user instruction
- [ ] Note any implicit requirements from context

## Non-goals

- [ ] List what is explicitly out of scope
- [ ] List what is planned but not implemented in this milestone

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
- [ ] ...

## Required proof

| Proof Type | Required? | Status | Notes |
|------------|-----------|--------|-------|
| Static code review | Yes/No | Pass/Fail | |
| Task-specific smoke | Yes/No | Pass/Fail | |
| Regression suite | Yes/No | Pass/Fail | List commands |
| Runtime health | Yes/No | Pass/Fail | Server/port/endpoint |
| Browser proof | Yes/No | Pass/Fail | Required for UI |
| Delivery proof | Yes/No | Pass/Fail | Required for artifacts |
| Post-refresh proof | Yes/No | Pass/Fail | Required for persistence |

## Tests to run

List exact commands:

```bash
# Example:
node scripts/webstudio-example-smoke.js
node scripts/webstudio-regression-smoke.js
```

## Browser proof required?

**Yes / No**

If YES:
- [ ] Playwright/Puppeteer test executed
- [ ] Console errors checked
- [ ] Page runtime errors checked
- [ ] Click flows verified
- [ ] curl-only proof NOT sufficient

## Regression suite required?

**Yes / No**

If YES, list exact commands:

```bash
# All requested tests must run and pass
node scripts/test-1.js
node scripts/test-2.js
node scripts/test-3.js
```

## Known risks

- [ ] List any known limitations
- [ ] List any areas with reduced confidence
- [ ] List any environmental constraints

---

## Quality Governor verdict

**STATUS:** ACCEPTED / CONDITIONALLY ACCEPTED / REJECTED / BLOCKED

### WHY

<Concise explanation of verdict>

### EVIDENCE

| Evidence Type | Status | Details |
|---------------|--------|---------|
| Tests | PASS/FAIL | List results |
| Browser proof | PASS/FAIL/NA | If required |
| Runtime proof | PASS/FAIL | Server health |
| Commit hash | `<hash>` | If repo milestone |
| Push status | ✅/❌ | origin/main |

### REMAINING LIMITATIONS

- [ ] Limitation 1
- [ ] Limitation 2
- [ ] ...

### REWORK REQUIRED

If REJECTED:

- [ ] Exact failure 1
- [ ] Exact failure 2
- [ ] Required fix 1
- [ ] Required fix 2

### NEXT SAFE STEP

<Recommendation for next milestone or rework action>

---

## Final sign-off

**Quality Governor approval required before marking COMPLETE.**

Do not report milestone as complete without this checklist filled and Quality Governor verdict = ACCEPTED or CONDITIONALLY ACCEPTED.
