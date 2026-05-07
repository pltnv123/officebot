# QMD Collection Health Index

**Version:** 1.0
**Date:** 2026-05-07
**Task:** qmd-collection-health-005

---

## Executive Summary

QMD collection health audit reveals **critical indexing gap**: recent autonomous execution reports under `/output/` are not indexed, making them unsearchable via `qmd search`.

**Collections Status:**

| Collection | Files | Status |
|------------|-------|--------|
| runbooks | 13 | ✅ Indexed |
| reports | 15 | ✅ Indexed (workspace only) |
| knowledge | 11 | ✅ Indexed |
| clients | 0 | ⚠️ Empty |
| deliverables | 0 | ⚠️ Empty |

**Critical Finding:**
- `/output/*.md` (42+ files) NOT indexed
- Recent autonomy reports unsearchable
- Agent Bridge V1 docs unsearchable
- CI/CD diagnostics unsearchable

---

## Collection Analysis

### runbooks (13 files)

**Path:** `/workspace/runbooks/`
**Status:** ✅ Healthy

**Contents:**
- Implementation checklist
- QA and delivery
- Long autonomous task
- Client lifecycle docs
- Sales offer routing
- GitHub repo review
- Web Studio intake

**Search Test:** `qmd search "implementation checklist"` — ✅ Works

---

### reports (15+ files)

**Path:** `/workspace/reports/`
**Status:** ⚠️ Partial

**Contents:**
- Officebot audit indexes
- PR history indexes
- Engineering audit indexes
- Hermes runtime source of truth
- QMD health index (new)
- Autonomy reports index (new)
- CI/CD reports index (new)

**Missing:**
- `/output/*.md` autonomy reports (42+ files) — not indexed

**Search Test:** `qmd search "autonomy reports"` — ✅ Now finds index

---

### knowledge (11+ files)

**Path:** `/workspace/knowledge/`
**Status:** ✅ Healthy

**Contents:**
- Agent delegation patterns
- GitHub safety principles
- Supabase safety principles
- QMD safe mode guide
- Telegram delivery rules
- Web Studio operating model
- Hermes QMD operating guide (new)

**Search Test:** `qmd search "qmd safe mode"` — ✅ Works

---

### clients (0 files)

**Path:** `/workspace/clients/`
**Status:** ⚠️ Empty

**Recommendation:**
- Add client intake summaries
- Add client communication logs
- Add project status reports

---

### deliverables (0 files)

**Path:** `/workspace/deliverables/`
**Status:** ⚠️ Empty

**Recommendation:**
- Add completed project deliverables
- Add template library
- Add case studies

---

## Critical Gap: /output/ Not Indexed

### Problem

All autonomous execution reports go to `/output/`:
- `/output/autonomy-dashboard.md`
- `/output/agent-bridge-v1-final-summary.md`
- `/output/cicd-diagnostics-001-execution-report.md`
- `/output/cicd-artifact-verification-002-report.md`
- `/output/runtime-lock-verification-004-report.md`
- `/output/autonomous-multitask-final-summary.md`
- 36+ more files

These files are:
- ❌ Not searchable via `qmd search`
- ❌ Not included in any collection
- ❌ Lost to knowledge base

### Root Cause

QMD collections configured for:
- `/workspace/runbooks/`
- `/workspace/reports/`
- `/workspace/knowledge/`
- `/workspace/clients/`
- `/workspace/deliverables/`

But NOT:
- `/output/` (Docker delivery path)
- `/home/hermes/.hermes/cache/documents/` (host path for /output)

---

## Recommended Fixes

### Option 1: Add /output to QMD Collections (Preferred)

**Action:** Update QMD config to include `/output/*.md`

**Config Location:** `~/.qmd/config.yaml` or collection definition

**New Collection:**
```yaml
collections:
  - name: autonomy-output
    path: /output
    pattern: "**/*.md"
    description: Autonomous execution reports and deliverables
```

**Pros:**
- All reports searchable
- No file movement needed
- Preserves current workflow

**Cons:**
- Requires QMD config change
- May need approval for config change

---

### Option 2: Create Index Documents (Implemented)

**Action:** Create summary indexes in `/workspace/reports/` that reference /output files

**Implemented:**
- `autonomy-reports-index.md` — indexes all autonomy reports
- `cicd-reports-index.md` — indexes CI/CD series
- `qmd-health-index.md` — documents the gap

**Pros:**
- No config changes needed
- Index is searchable
- Provides curated view

**Cons:**
- Manual maintenance required
- Full reports still unsearchable

---

## Search Test Results

### Before Index Creation

| Query | Expected | Actual | Status |
|-------|----------|--------|--------|
| "autonomy dashboard" | Find dashboard docs | ❌ No results | FAIL |
| "agent bridge v1" | Find Agent Bridge docs | ❌ No results | FAIL |
| "CI/CD diagnostics" | Find CI/CD reports | ❌ No results | FAIL |
| "repo hygiene" | Find hygiene docs | ✅ Found | PASS |
| "QMD safe mode" | Find QMD guide | ✅ Found | PASS |

### After Index Creation

| Query | Expected | Actual | Status |
|-------|----------|--------|--------|
| "QMD health" | Find this index | ✅ Found (84%) | PASS |
| "autonomy reports" | Find autonomy index | ✅ Found (81%) | PASS |
| "CI/CD diagnostics" | Find CI/CD index | ✅ Found (87%) | PASS |
| "agent bridge" | Find autonomy index | ✅ Found (88%) | PASS |

---

## Related Documents

- QMD Safe Mode Guide: `/workspace/knowledge/qmd-safe-mode.md`
- Hermes Runtime Source of Truth: `/workspace/reports/hermes-runtime-source-of-truth.md`
- Agentic Scheduler V2: `docs/hermes-platform/agentic-scheduler-v2.md`
- Autonomy Dashboard: `/output/autonomy-dashboard.md`

---

## Safety Verification

- ✅ QMD safe mode only (ls, search, update, get)
- ✅ No qmd query/vsearch/embed
- ✅ No destructive cleanup
- ✅ No deletion of QMD data
- ✅ No source/workflow/runtime changes
- ✅ Index docs created in allowed paths
