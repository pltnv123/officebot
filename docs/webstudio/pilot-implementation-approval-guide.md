# WebStudio Pilot Implementation Approval Guide

**Version:** 1.0  
**Date:** 2026-05-11  
**Status:** Ready for owner review

---

## Overview

This guide explains the pilot implementation approval process for Commercial V5 WebStudio engagements. All pilots require explicit owner approval before any production work begins.

---

## Approval Workflow

### Step 1: Owner Selects Pilot Scenario

**Input:** Owner reviews `/output/pilot-selection-ranking.md`

**Decision:** Select 1-2 pilot scenarios from top-ranked options

**Recommended:**
- Pilot #1: AI Automation Agency B2B Leads (Rank #1)
- Pilot #2: Cybersecurity SaaS Trust Site (Rank #2)

---

### Step 2: Owner Reviews Approval Prompt

**Input:** Owner reads pilot-specific approval prompt

**Files:**
- Pilot #1: `/output/pilot-ai-automation-agency-b2b-leads-approval-prompt.md`
- Pilot #2: `/output/pilot-cybersecurity-saas-trust-site-approval-prompt.md`

**Review Checklist:**
- [ ] Scope clearly understood
- [ ] Allowed files/actions reviewed
- [ ] Forbidden files/actions reviewed
- [ ] Implementation boundaries clear
- [ ] Rollback plan acceptable
- [ ] Verification plan clear
- [ ] QA requirements understood
- [ ] hfinalize requirement acknowledged
- [ ] STOP conditions understood

---

### Step 3: Owner Sends Approval Message

**Format:** See `/output/pilot-selection-next-approval-texts.md`

**Example (Pilot #1):**
```
APPROVE: pilot-ai-automation-agency-b2b-leads
Conditions:
- Placeholder integrations only
- No deployment without separate approval
- Weekly progress reports to /output/
- hfinalize after each session
- QA score minimum 85/100
- Stop if compliance questions arise
```

---

### Step 4: APR Created

**Action:** Hermes creates Approval Request Packet (APR)

**Location:** `/workspace/autonomy/approvals/pending/APR-XXX.yaml`

**Contents:**
- Task description
- Exact scope (allowed files/actions)
- Forbidden files/actions
- Implementation boundaries
- Rollback plan
- Verification plan
- QA requirements
- hfinalize requirement
- STOP conditions

---

### Step 5: Owner Moves APR to Approved

**Command:**
```bash
# List pending approvals
happrovals list

# Move to approved
mv /workspace/autonomy/approvals/pending/APR-XXX.yaml /workspace/autonomy/approvals/approved/
```

**Alternative:** Reply to chat with explicit approval confirmation

---

### Step 6: Production Begins

**Action:** Hermes begins pilot production

**Constraints:**
- Only allowed files/actions
- No forbidden files/actions
- Weekly progress reports
- hfinalize after each session
- QA scorecard before delivery

---

## Approval Boundaries

### No Approval Needed (Autonomous)

- ✅ Proposal generation
- ✅ QA scoring
- ✅ Archive creation
- ✅ Documentation updates (docs-only PRs)
- ✅ Report-only tasks
- ✅ Read-only audits
- ✅ Backlog updates
- ✅ Dashboard updates

### Approval Required (Explicit)

- ⚠️ Pilot production kickoff (APR-008, APR-009)
- ⚠️ Client proposal delivery (owner review before sending)
- ⚠️ Deployment (separate explicit approval)
- ⚠️ Implementation work (approval-gated tasks)
- ⚠️ Source/workflow/runtime changes
- ⚠️ Supabase writes
- ⚠️ Direct main branch pushes
- ⚠️ Force pushes
- ⚠️ GitHub Releases/artifact uploads

---

## Pilot #1 Approval Details

### Scenario: AI Automation Agency B2B Leads

**APR-ID:** APR-008 (pending)

**Allowed Actions:**
1. Create production folder: `/workspace/projects/ai-automation-agency-b2b/`
2. Generate HTML/CSS landing page
3. Use placeholder integrations (no credentials)
4. Run QA scorecard
5. Create delivery archive (8 files)
6. Run hfinalize

**Forbidden Actions:**
- No files outside project folder
- No `.env` files or credentials
- No workflow/runtime changes
- No VPS/SSH commands
- No Supabase writes
- No deployment commands
- No external API calls with credentials

**Timeline:** 4 weeks from approval

**QA Requirement:** Score ≥85/100

**STOP Conditions:**
- QA score <85/100
- Compliance question arises
- Owner dependency missing (not placeholder-able)
- Secret/credential required
- Scope creep detected
- Timeline slippage >7 days

---

## Pilot #2 Approval Details

### Scenario: Cybersecurity SaaS Trust Site

**APR-ID:** APR-009 (pending, after pilot #1)

**Allowed Actions:**
1. Create production folder: `/workspace/projects/cybersecurity-saas-trust/`
2. Generate HTML/CSS multi-section site (2-3 sections max)
3. Use placeholder integrations (no credentials)
4. Run QA scorecard
5. Create delivery archive (8 files)
6. Run hfinalize

**Forbidden Actions:**
- No files outside project folder
- No `.env` files or credentials
- No workflow/runtime changes
- No VPS/SSH commands
- No Supabase writes
- No deployment commands
- No external API calls with credentials

**Timeline:** 5 weeks from approval

**QA Requirement:** Score ≥85/100

**STOP Conditions:**
- QA score <85/100
- Security compliance question arises
- Owner dependency missing (not placeholder-able)
- Secret/credential required
- Scope creep detected
- Timeline slippage >7 days

---

## Safe Tasks (Can Approve Now)

### Analytics Setup (GA4)

**Task ID:** impl-approved-003

**Scope:** GA4 placeholder integration for all scenarios

**Why Safe:**
- Standard industry practice
- No backend required
- Placeholder ID slot only
- Reusable across all scenarios

**Approval Response:**
```
APPROVE: impl-approved-003-analytics-setup
```

---

### Accessibility Compliance Audit

**Task ID:** security-followup-004

**Scope:** Audit all 8 scenarios for accessibility compliance

**Why Safe:**
- Report-only (no writes)
- Low risk
- High value (compliance, inclusivity)
- Reusable for future scenarios

**Approval Response:**
```
APPROVE: security-followup-004-accessibility-audit
```

---

## Deferred Tasks (Do Not Approve Yet)

| Task ID | Task | Reason |
|---------|------|--------|
| impl-approved-002 | CRM integration | No real client yet |
| impl-approved-004 | Booking system | No luxury clinic client |
| impl-approved-005 | Payment gateway | No e-commerce client |

**When Ready:** After real clients selected with specific needs

---

## Verification Requirements

### Before Any Delivery

1. ✅ QA scorecard ≥85/100
2. ✅ Manual review complete
3. ✅ Secret scan PASS (redacted report)
4. ✅ hfinalize PASS
5. ✅ Owner review complete
6. ✅ Delivery archive complete (8 files)

**Evidence Location:** `/output/pilot-*-*.md`

---

## Rollback Plan

**If issues detected during production:**

1. **STOP immediately**
2. **Document issue:** `/output/pilot-<scenario>-issue-*.md`
3. **Notify owner:** Evidence + issue description
4. **Await revised approval:** Do not proceed until owner responds

**No changes are destructive** — all work in isolated project folders.

---

## Weekly Progress Reports

**Format:** `/output/pilot-<scenario>-week-N.md`

**Contents:**
- Week N milestone status
- QA score (if applicable)
- Issues encountered
- Next week plan
- hfinalize status

**Schedule:** Every Friday during production

---

## Post-Delivery

### Retrospective

**File:** `/output/pilot-<scenario>-retrospective.md`

**Contents:**
- What went well
- What could improve
- Lessons learned
- Template updates needed
- Risk register updates

### Case Study

**File:** `/output/pilot-<scenario>-case-study.md`

**Contents:**
- Scenario overview
- Timeline achieved
- QA score achieved
- Owner feedback
- Client outcomes (if real client)

---

**Prepared:** 2026-05-11  
**Version:** 1.0  
**Status:** Ready for owner review  
**Next:** Owner approves pilots using this guide
