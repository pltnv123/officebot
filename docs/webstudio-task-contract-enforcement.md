# WebStudio Task Contract Enforcement

## Why Previous Failures Happened

Previous Studio OS v2 attempts failed because:

1. **Premature completion** — Agents reported COMPLETE without all proofs
2. **Partial work accepted** — 3 of 20 tests done, called "done"
3. **Git divergence paralysis** — Asked user instead of using safe default
4. **Vague requirements** — "Improve UX" without measurable criteria
5. **Missing browser proof** — curl-only for UI bugs
6. **No final gate** — Quality Governor bypassed or skipped

## Task Contract Model

Every milestone must start with a Task Contract:

```markdown
# Task Contract: <Task Name>

## Goal
<exact goal from user instruction>

## Scope (In)
- <item 1>
- <item 2>

## Scope (Out) — Non-Goals
- <item 1>
- <item 2>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>

## Required Proof
- <proof 1>
- <proof 2>

## Commit/Push Required
YES / NO

## Report Format
<expected report sections>
```

## Exact Literal Requirement Matching

- If task requests 20 tests, verify all 20 — not 3 "similar" tests
- If task requests exact route `/webstudio/demo`, do not accept `/webstudio/`
- If task requests commit + push, verify both — not just commit
- If task requests browser proof, curl-only is insufficient
- If task requests screenshot, describe + attach — not just "looks good"

## Safe Default Policy

| Situation | Safe Default |
|-----------|--------------|
| Git diverged | Create safety branch, push there |
| Missing skill | Search + inspect before install |
| Test outdated | Update narrowly, rerun |
| Subagent timeout | Manual verification + mark limitation |
| Uncertain source | Document uncertainty, do not overclaim |

**Ask user ONLY for:**
- Destructive git operations (force push)
- Data deletion
- Production deployment
- Secret exposure
- Paid external service usage
- Irreversible architecture change

## Git Divergence Safe Default

```bash
# If diverged, do NOT force push
BRANCH="webstudio/studio-os-v2-compliance-$(date +%Y%m%d-%H%M%S)"
git switch -c "$BRANCH" || git checkout -b "$BRANCH"
git add <explicit files only>
git commit -m "<milestone>"
git push -u origin "$BRANCH"
```

Report branch name and commit hash. Main branch remains untouched.

## No Premature COMPLETE Policy

**COMPLETE is only valid when:**
1. Task Contract created
2. All contract items DONE
3. All proofs present (browser, delivery, git, etc.)
4. Quality Governor verdict = ACCEPTED or CONDITIONALLY ACCEPTED
5. Commit + push complete (if required)

**If any item missing:**
- Verdict = REJECTED — REWORK REQUIRED
- List exact missing items
- Route back to relevant specialist

## Required Final Checklist

Every final report must include:

```markdown
## TASK CONTRACT CHECK

**Requested Items:**
- <list>

**Done:**
- ✅ <item> — <evidence>

**Missing:**
- ❌ <item> — <reason>

**Blocked:**
- 🚧 <item> — <blocker>

**Safe Defaults Used:**
- <default>

**Verdict:**
ACCEPTED / CONDITIONALLY ACCEPTED / REJECTED — REWORK REQUIRED / BLOCKED
```

## How Quality Governor Uses It

Quality Governor:
1. Reads Task Contract before verification
2. Verifies each checklist item has evidence
3. Runs 6-layer verification (static, smoke, regression, runtime, browser, delivery)
4. Outputs hard-gate verdict
5. **Cannot accept without Task Contract checklist**

## Integration

- Task Contract Enforcer workspace owns this policy
- Skill `webstudio-task-contract-enforcer` implements it
- All specialist AGENTS.md include TASK CONTRACT RULE
- Task Contracts saved to `docs/acceptance/<task>-contract.md`

## Organism Memory Contract Check

For any stateful/runtime WebStudio task, Task Contract must include organism memory verification:

**Checklist:**
- [ ] Persistent env file exists: `~/.openclaw/secrets/webstudio-supabase.env`
- [ ] Permissions are 600
- [ ] /api/state returns JSON
- [ ] supabase.configured = true
- [ ] supabase.restProbeOk = true
- [ ] No secrets leaked

**Rejection Rules:**
- Task touches runtime state but organism check skipped → REJECTED
- /api/state returns HTML or 404 → REJECTED
- Env file only in /tmp → REJECTED
- Secrets detected → BLOCKED

## Skill Intelligence Contract Check

For any complex/non-trivial WebStudio task, Task Contract must include Skill Intelligence verification:

**Checklist:**
- [ ] Skill scan run (`node scripts/webstudio-skill-intelligence-scan.js` or `openclaw skills check`)
- [ ] Installed skills checked
- [ ] Eligible skills checked
- [ ] Missing requirements identified or ruled out
- [ ] ClawHub searched if capability gap exists
- [ ] Risky skills require approval (channel/secrets/payment/system)
- [ ] Skill registry updated
- [ ] **SKILL INTELLIGENCE CHECK** section in final report

**Rejection Rules:**
- Complex task but Skill Check skipped → REJECTED
- Missing skill needed but ignored → REJECTED
- Risky skill installed without approval → REJECTED
- Final report lacks SKILL INTELLIGENCE CHECK section → REJECTED

**When Skill Check is mandatory:**
- browser automation tasks
- code generation tasks
- API integration tasks
- deployment/runtime tasks
- external service tasks
- data/document/PDF/spreadsheets tasks
- messaging channel tasks
- secrets handling tasks
- any task that previously failed due to missing tool/skill

**When Skill Check is NOT required:**
- trivial edits (single-line fix)
- documentation-only updates
- pure git operations
- already-verified organism health checks
