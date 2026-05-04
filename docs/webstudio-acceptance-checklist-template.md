# WebStudio Acceptance Checklist Template

**Milestone:** `<MILESTONE-NAME>`
**Date:** `<YYYY-MM-DD>`
**Quality Governor:** `<agent-name>`

---

## Pre-Verification

- [ ] Latest user instruction reviewed
- [ ] Scope boundaries confirmed
- [ ] Acceptance criteria extracted from instruction
- [ ] Relevant existing tests identified
- [ ] No stale milestone continuation

---

## Layer A: Static/Code Sanity

| Check | Status | Notes |
|-------|--------|-------|
| Exact labels/contracts verified (grep) | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Function/class presence confirmed | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Whitelist/blacklist logic present | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No obvious typos or syntax errors | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Changed files match intended scope | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |

**Layer A Verdict:** ⬜ PASS / ⬜ FAIL

---

## Layer B: Focused Task Smoke

| Check | Status | Notes |
|-------|--------|-------|
| Task-specific smoke test created | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Task-specific smoke test passes | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| All assertions in smoke pass | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No skipped critical assertions | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |

**Layer B Verdict:** ⬜ PASS / ⬜ FAIL

---

## Layer C: Regression Verification

| Check | Status | Notes |
|-------|--------|-------|
| Relevant existing smokes identified | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Regression tests run | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No new failures introduced | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Known flaky tests documented | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |

**Layer C Verdict:** ⬜ PASS / ⬜ FAIL

---

## Layer D: Runtime Health

| Check | Status | Notes |
|-------|--------|-------|
| Server PID confirmed | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Port listening | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Health endpoint HTTP 200 | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No recent errors in log | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |

**Layer D Verdict:** ⬜ PASS / ⬜ FAIL

---

## Layer E: Browser/Interaction Proof (UI tasks only)

| Check | Status | Notes |
|-------|--------|-------|
| Browser automation available | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Real click-flow verified | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Console errors checked | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No null/undefined DOM errors | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Page runtime errors checked | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| curl-only proof NOT used as sole evidence | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |

**Layer E Verdict:** ⬜ PASS / ⬜ FAIL / ⬜ N/A (non-UI task)

---

## Layer F: Delivery/Product Proof (artifact tasks only)

| Check | Status | Notes |
|-------|--------|-------|
| Delivery page opens (HTTP 200) | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Run Script button works | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Download ZIP works | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Run History loads | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| File preview works | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No `artifactId is not defined` errors | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No `JSON.parse undefined` errors | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Post-refresh actions work | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Artifact identity correct | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |

**Layer F Verdict:** ⬜ PASS / ⬜ FAIL / ⬜ N/A (non-artifact task)

---

## Git Discipline

| Check | Status | Notes |
|-------|--------|-------|
| Only relevant files staged | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No `git add .` used | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No backend.log committed | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No runtime storage committed | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| No secrets committed | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Commit message descriptive | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |
| Push to origin successful | ⬜ PASS / ⬜ FAIL / ⬜ N/A | |

**Git Discipline Verdict:** ⬜ PASS / ⬜ FAIL

---

## Quality Governor Verdict

### STATUS

⬜ **ACCEPTED** — All required acceptance criteria met, all proofs present, no critical regression

⬜ **CONDITIONALLY ACCEPTED** — Non-critical limitations explicitly listed and acceptable

⬜ **REJECTED — REWORK REQUIRED** — Requirements incomplete, proof insufficient, regression detected

⬜ **BLOCKED** — Environmental/runtime/tooling blocker; honest report

---

### WHY

<!-- Concise explanation of verdict -->



---

### EVIDENCE

| Evidence Type | Status | Details |
|---------------|--------|---------|
| Static grep | | |
| Task smoke | | |
| Regression tests | | |
| Runtime health | | |
| Browser proof | | |
| Delivery proof | | |
| Commit hash | | |
| Push status | | |

---

### REMAINING LIMITATIONS

<!-- Explicit list of remaining limitations (if CONDITIONALLY ACCEPTED) -->

1.
2.
3.

---

### NEXT SAFE STEP

<!-- Recommendation for next milestone or action -->



---

## Sign-off

**Quality Governor:** `<agent-name>`
**Timestamp:** `<ISO-8601>`
**Session:** `<session-key>`

---

## Notes for Future Use

1. **Do not skip layers** — Each layer serves a distinct purpose
2. **curl-only is insufficient for UI** — Browser proof required for click-flow tasks
3. **Honest BLOCKED over fake confidence** — Report blockers truthfully
4. **Bounded rework** — Up to 3 cycles; then escalate
5. **Evidence over claims** — Every check must have verifiable evidence

---

## Related Docs

- docs/webstudio-studio-os-v2.md — Studio OS v2 specification
- docs/webstudio-quality-governor.md — Quality Governor specification
- docs/webstudio-studio-os-v2-roadmap.md — Roadmap
