# WebStudio Pilot Selection Board

**Version:** 1.0  
**Date:** 2026-05-11  
**Status:** Ready for owner review

---

## Overview

This document provides the pilot selection framework for Commercial V5 WebStudio engagements. After generating 8 commercial scenarios with consistent 87/100 QA scores, we have ranked them by safety, complexity, and strategic value to recommend optimal pilot candidates.

---

## Pilot Selection Criteria

### Ranking Factors

1. **Commercial Potential (15%)** — Investment band, market demand
2. **Delivery Complexity (15%)** — Timeline, technical difficulty (lower is better for pilot)
3. **Compliance Risk (15%)** — Regulated industry, legal exposure (lower is better)
4. **Owner Dependencies (10%)** — Missing assets/credentials (fewer is better)
5. **QA/Proposal Score (10%)** — All scenarios scored 87/100
6. **Red-Team Risk (10%)** — Mitigated risks (lower is better)
7. **Template Reusability (10%)** — Future scenario template value
8. **WebStudio Proof Value (10%)** — Demonstrates platform capability
9. **No-Credentials Completion (5%)** — Can finish without external credentials

---

## Scenario Rankings

| Rank | Scenario | Investment | Timeline | Status |
|------|----------|------------|----------|--------|
| 1 | AI Automation Agency (B2B) | 5K-10K | 4 weeks | ✅ PILOT NOW |
| 2 | Cybersecurity SaaS (Trust) | 10K-18K | 5 weeks | ✅ PILOT NOW |
| 3 | Cross-Border Logistics (B2B) | 8K-15K | 5 weeks | ⏳ PILOT LATER |
| 4 | Real Estate Villas (Premium) | 12K-25K | 5 weeks | ⏳ PILOT LATER |
| 5 | Legal Consulting (High Trust) | 10K-20K | 5 weeks | ⏳ PILOT LATER |
| 6 | Luxury Clinic (Booking Funnel) | 10K-18K | 6 weeks | ⚠️ NEEDS CREDENTIALS |
| 7 | E-commerce (Premium Brand) | 12K-25K | 6 weeks | ⚠️ NEEDS CREDENTIALS |
| 8 | Crypto OTC (Premium Urgent) | 15K-25K +20% | 3 weeks | ⚠️ HIGH COMPLIANCE |

---

## Recommended Pilots

### Pilot #1: AI Automation Agency B2B Leads

**Why First:**
- Lowest complexity (4 weeks)
- No credential blockers
- High template reusability
- Demonstrates core WebStudio capability
- Fastest path to case study

**Risk Score:** 19/100 (vs 38/100 baseline) — Significantly safer than average

**Approval Required:** APR-008 (pending owner approval)

**Readiness Docs:**
- Implementation readiness: `/output/pilot-ai-automation-agency-b2b-leads-implementation-readiness.md`
- Approval prompt: `/output/pilot-ai-automation-agency-b2b-leads-approval-prompt.md`
- Risk register: `/output/pilot-ai-automation-agency-b2b-leads-risk-register.md`
- Acceptance criteria: `/output/pilot-ai-automation-agency-b2b-leads-acceptance-criteria.md`

---

### Pilot #2: Cybersecurity SaaS Trust Site

**Why Second:**
- Balanced complexity (5 weeks)
- No credential blockers
- Strong SaaS template value
- Demonstrates trust-building capability
- Higher investment band

**Risk Score:** 22/100 (vs 38/100 baseline) — Safer than average

**Approval Required:** APR-009 (pending owner approval, after pilot #1)

**Readiness Docs:**
- Implementation readiness: `/output/pilot-cybersecurity-saas-trust-site-implementation-readiness.md`
- Approval prompt: `/output/pilot-cybersecurity-saas-trust-site-approval-prompt.md`
- Risk register: `/output/pilot-cybersecurity-saas-trust-site-risk-register.md`
- Acceptance criteria: `/output/pilot-cybersecurity-saas-trust-site-acceptance-criteria.md`

---

## Deferred Scenarios

### Needs Owner Inputs (1 scenario)

**Luxury Clinic Booking Funnel** — Blocked by:
- Booking system API credentials required
- Medical/HIPAA compliance review needed
- Before/after photo assets required

**When Ready:** After 2 successful pilots, with real client

---

### Defer Compliance (2 scenarios)

**E-commerce Premium Brand Refresh** — Blocked by:
- Payment gateway credentials (Stripe/PayPal)
- Product catalog (photos, descriptions, SKUs)
- Shipping/tax configuration

**When Ready:** After 3 successful pilots, with real e-commerce client

**Crypto OTC Premium Urgent Launch** — Blocked by:
- Financial/crypto compliance (legal counsel required)
- Urgent timeline pressure (3 weeks)
- High regulatory exposure

**When Ready:** Only with real client who has legal counsel and compliance budget

---

## Approval Boundaries

### No Approval Needed (Autonomous)

- ✅ Proposal generation
- ✅ QA scoring
- ✅ Archive creation
- ✅ Documentation updates (docs-only PRs)
- ✅ Report-only tasks
- ✅ Read-only audits

### Approval Required (Explicit)

- ⚠️ Pilot production kickoff (APR-008, APR-009)
- ⚠️ Client proposal delivery (owner review before sending)
- ⚠️ Deployment (separate explicit approval)
- ⚠️ Implementation work (approval-gated tasks)
- ⚠️ Source/workflow/runtime changes
- ⚠️ Supabase writes
- ⚠️ Direct main branch pushes

---

## Safe to Approve Now

| Task ID | Task | Risk | Recommendation |
|---------|------|------|----------------|
| pilot-ai-automation-agency | Pilot #1 production | Low | ✅ APPROVE |
| pilot-cybersecurity-saas | Pilot #2 production | Low-Medium | ✅ APPROVE (after #1) |
| impl-approved-003 | Analytics setup (GA4) | Medium | ✅ APPROVE |
| security-followup-004 | Accessibility audit | Medium | ✅ APPROVE |

---

## Defer Until Client Selected

| Task ID | Task | Reason |
|---------|------|--------|
| impl-approved-002 | CRM integration | No real client yet |
| impl-approved-004 | Booking system | No luxury clinic client |
| impl-approved-005 | Payment gateway | No e-commerce client |

---

## Next Owner Actions

### Immediate (This Week)

1. **Review pilot selection docs** — 15 min
2. **Select pilot #1** — Decision: AI Automation or Cybersecurity
3. **Approve pilot approval prompt** — Review scope and conditions
4. **Approve safe tasks** — Analytics + Accessibility

### Short-Term (Next 4 Weeks)

1. **Pilot #1 production** — Weekly progress reports
2. **Pilot #1 delivery** — Week 4
3. **Case study creation** — After delivery
4. **Pilot #2 selection** — After pilot #1 retrospective

---

## Decision Board

**Owner Decision Required:** Select 1-2 pilots and approve implementation

**Exact Response Format:** See `/output/pilot-selection-next-approval-texts.md`

**Decision Deadline:** Within 48 hours (recommended)

**Review Call:** Available if needed (30 min)

---

## Evidence Files

**Location:** `/output/`

| File | Purpose |
|------|---------|
| `pilot-selection-ranking.md` | Full ranking analysis (8 scenarios) |
| `pilot-selection-ranking.csv` | Machine-readable ranking data |
| `pilot-selection-phase-1-evidence-review.md` | Evidence loaded |
| `pilot-selection-do-not-approve-yet.md` | What to defer and why |
| `pilot-selection-owner-decision-board.md` | Decision framework |
| `pilot-selection-next-approval-texts.md` | Approval text templates |

**Pilot Readiness Files:**

| File | Purpose |
|------|---------|
| `pilot-ai-automation-*-*.md` (4 files) | Pilot #1 readiness |
| `pilot-cybersecurity-saas-*-*.md` (4 files) | Pilot #2 readiness |

---

## Success Metrics

### Pilot Phase (Month 1-3)

| Metric | Target | Current |
|--------|--------|---------|
| Pilot scenarios selected | 2 | Pending |
| Pilot #1 delivery | Week 4 | Pending |
| QA score maintained | 85+ | 87/100 (baseline) |
| Owner review cycle | <48 hours | Pending |
| Case studies created | 2 | 0 |

### Scale Phase (Month 4-6)

| Metric | Target |
|--------|--------|
| Clients/month | 4-6 |
| Revenue/month | 40K-90K |
| Sales cycle | <14 days |
| Case studies | 3-5 |

---

**Prepared:** 2026-05-11  
**Version:** 1.0  
**Status:** Ready for owner review  
**Next:** Owner selects pilots and approves implementation
