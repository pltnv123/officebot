# Hermes QMD Operating Guide

**Version:** 1.0
**Date:** 2026-05-07
**Purpose:** Operating procedures for QMD knowledge management

---

## Overview

QMD (Knowledge Sidecar) provides local knowledge base indexing and search for the Hermes Web Studio workspace.

**Current Version:** 2.1.0

---

## Safe Mode Operations (Allowed Autonomously)

### Commands

| Command | Purpose | Risk |
|---------|---------|------|
| `qmd --version` | Check version | ✅ Safe |
| `qmd ls` | List collections | ✅ Safe |
| `qmd ls <collection>` | List collection contents | ✅ Safe |
| `qmd search "<query>" -n 5` | Keyword search | ✅ Safe |
| `qmd search "<query>" -c <collection> -n 5` | Collection-scoped search | ✅ Safe |
| `qmd get qmd://<collection>/<file>.md` | Get specific file | ✅ Safe |
| `qmd update` | Update index | ✅ Safe |
| `qmd status` | Check status | ✅ Safe |

### Usage Examples

```bash
# Check version
qmd --version

# List all collections
qmd ls

# Search for autonomy dashboard
qmd search "autonomy dashboard" -n 5

# Search in runbooks collection only
qmd search "implementation checklist" -c runbooks -n 5

# Get specific runbook
qmd get qmd://runbooks/implementation-checklist.md

# Update all collections
qmd update

# Check status
qmd status
```

---

## Forbidden Operations (Require Approval)

### Commands

| Command | Reason | Risk Level |
|---------|--------|------------|
| `qmd query` | Uses LLM, slow, expensive | HIGH |
| `qmd vsearch` | Vector/semantic search, requires embeddings | HIGH |
| `qmd embed` | Generates embeddings, GPU-intensive | HIGH |

### Why Forbidden

1. **No GPU Available** — This VPS has no GPU; vector operations are slow
2. **LLM Overhead** — `qmd query` invokes local LLM, very slow
3. **Resource Consumption** — Embedding generation is expensive
4. **Unnecessary** — Keyword search sufficient for most use cases

---

## Collections

### Current Collections

| Collection | Path | Files | Purpose |
|------------|------|-------|---------|
| runbooks | `/workspace/runbooks/` | 13 | Operational procedures |
| reports | `/workspace/reports/` | 18+ | Audit reports and indexes |
| knowledge | `/workspace/knowledge/` | 12+ | Operating principles |
| clients | `/workspace/clients/` | 0 | Client information (empty) |
| deliverables | `/workspace/deliverables/` | 0 | Project deliverables (empty) |

### Known Gaps

| Gap | Impact | Fix Proposed |
|-----|--------|--------------|
| `/output/*.md` not indexed | 42+ autonomy reports unsearchable | Index docs created |
| clients empty | No client context | Add client intake docs |
| deliverables empty | No project history | Add completed deliverables |

---

## Index Maintenance

### After Each Autonomous Batch

1. Run `qmd update` to index new files
2. Verify search works for new content
3. Update index documents if needed

### Monthly Maintenance

1. Review collection health
2. Identify stale content
3. Propose cleanup (requires approval)
4. Update this guide if procedures change

---

## Search Best Practices

### Effective Queries

```bash
# Specific keywords
qmd search "implementation checklist" -n 5

# Multiple keywords (OR logic)
qmd search "autonomy OR scheduler" -n 10

# Phrase search
qmd search "agent bridge v1" -n 5

# Collection-scoped
qmd search "CI/CD" -c reports -n 5
```

### Ineffective Queries

```bash
# Too vague
qmd search "help" -n 5

# Too long
qmd search "how do I fix the CI/CD pipeline when it fails" -n 5

# Natural language (use keywords instead)
qmd search "what is the best way to" -n 5
```

---

## Troubleshooting

### Search Returns No Results

**Possible Causes:**
1. File not in indexed collection
2. Keywords don't match content
3. Collection not updated

**Fixes:**
1. Check file location: `ls -la /workspace/reports/`
2. Run `qmd update` to refresh index
3. Try different keywords

### QMD Command Not Found

**Fix:**
```bash
# Ensure PATH includes QMD
export PATH="/home/hermes/.hermes/node/bin:$PATH"

# Or use full path
/home/hermes/.hermes/node/bin/qmd --version
```

### Docker Environment

When running from Docker sandbox:
```bash
# Set environment variables
export HOME=/home/hermes
export XDG_CACHE_HOME=/home/hermes/.cache
export PATH="/home/hermes/.hermes/node/bin:$PATH"

# Then run QMD
qmd --version
```

---

## Related Documents

| Document | Path | Purpose |
|----------|------|---------|
| QMD Health Index | `docs/hermes-platform/qmd-health-index.md` | Collection health status |
| QMD Safe Mode | `/workspace/knowledge/qmd-safe-mode.md` | Safe mode principles |
| Autonomy Reports Index | `/workspace/reports/autonomy-reports-index.md` | Report directory |

---

## Maintenance

**Last Updated:** 2026-05-07 17:46 UTC

**Maintainer:** Hermes Autonomous Scheduler v2

**Review Frequency:** Monthly or after major QMD changes
